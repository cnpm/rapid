use crate::channel::subscriber;
use std::fmt::{Debug, Display, Formatter};
use std::io::SeekFrom;

use crate::error::{Error, Result};
use crate::meta::PackageRequest;
use crate::pool::{Command, Executor, Pool, PoolError, PoolRequest};
use crate::store::bucket::NpmBucketStore;
use crate::store::stargz::TocIndex;
use futures::future::join_all;

use std::path::{Path, PathBuf};

use std::sync::Arc;
use std::time::Duration;

use crate::store::listener::{EntryListener, PackageEntry};
use crate::store::TocEntry;
use crate::util::{AsyncReadVec, MultiWriter};
use async_trait::async_trait;
use bytes::Buf;
use futures_util::future::try_join_all;
use tokio::fs::{DirBuilder, OpenOptions};
use tokio::io::{AsyncRead, AsyncReadExt, AsyncSeekExt, AsyncWrite};
use tokio::sync::mpsc::Sender as TokioSender;
use tokio::sync::mpsc::{Receiver, Sender};
use tokio::sync::Mutex;
use tokio::task::JoinHandle;
use tokio_tar::{Archive, Entry};

pub struct NpmStore {
    pub bucket_size: u8,
    bucket_dir: PathBuf,
    entry_listener: Option<EntryListener>,
    buckets: Pool<NpmBucketStore>,
}

pub struct NpmBucketStoreExecuteCommand<R: AsyncRead + Send + Sync + Unpin> {
    pub request: PackageRequest,
    pub reader: R,
}

impl<R: AsyncRead + Send + Sync + Unpin> Display for NpmBucketStoreExecuteCommand<R> {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        self.request.fmt(f)
    }
}

impl<R: AsyncRead + Send + Sync + Unpin> Command for NpmBucketStoreExecuteCommand<R> {
    type CommandDesc = PackageRequest;

    fn get_id(&self) -> &str {
        self.request.url()
    }

    fn get_desc(&self) -> Self::CommandDesc {
        self.request.clone()
    }
}

pub struct NpmBucketStoreExecuteResult {
    pub pkg_request: PackageRequest,
    pub pkg_size: usize,
    pub toc_index: TocIndex,
    pub tar_name: String,
}

#[async_trait]
impl Executor for NpmBucketStore {
    type Command = NpmBucketStoreExecuteCommand<Box<dyn AsyncRead + Send + Sync + Unpin>>;
    type OkType = NpmBucketStoreExecuteResult;
    type ErrorType = Error;

    async fn execute(
        &mut self,
        command: Self::Command,
    ) -> std::result::Result<NpmBucketStoreExecuteResult, Error> {
        let (size, index) = self.add_package(&command.request, command.reader).await?;
        Ok(NpmBucketStoreExecuteResult {
            pkg_size: size,
            toc_index: index,
            tar_name: String::from(&self.name),
            pkg_request: command.request,
        })
    }
}

impl NpmStore {
    pub async fn new(
        bucket_size: u8,
        bucket_dir: &Path,
        timeout: Duration,
        entry_listener: Option<EntryListener>,
    ) -> Result<NpmStore> {
        let mut toc_indices = Vec::with_capacity(bucket_size as usize);
        for _ in 0..bucket_size {
            toc_indices.push(Mutex::new(TocIndex::new()));
        }
        NpmStore::prepare_env(bucket_dir).await?;
        let pool = NpmStore::init_pool(bucket_size, bucket_dir, timeout, &entry_listener).await?;

        let store = NpmStore {
            bucket_dir: PathBuf::from(bucket_dir),
            bucket_size,
            buckets: Pool::new(String::from("store_poll"), pool),
            entry_listener,
        };
        Ok(store)
    }

    pub async fn batch_execute(
        &self,
        receiver: Receiver<NpmBucketStoreExecuteCommand<Box<dyn AsyncRead + Send + Sync + Unpin>>>,
        sender: Sender<NpmBucketStoreExecuteResult>,
    ) -> std::result::Result<(), PoolError<PackageRequest, Error>> {
        self.buckets
            .batch_execute_with_receiver(receiver, sender)
            .await
    }

    async fn prepare_env(bucket_dir: &Path) -> Result<()> {
        DirBuilder::new().recursive(true).create(bucket_dir).await?;
        Ok(())
    }

    async fn init_pool(
        bucket_size: u8,
        bucket_dir: &Path,
        timeout: Duration,
        entry_listener: &Option<EntryListener>,
    ) -> Result<Vec<NpmBucketStore>> {
        let mut buckets = Vec::with_capacity(bucket_size as usize);
        for index in 0..bucket_size {
            let bucket = NpmStore::static_build_bucket(
                bucket_dir,
                index as u8,
                timeout,
                entry_listener.clone(),
            )
            .await?;
            buckets.push(bucket);
        }
        Ok(buckets)
    }

    async fn static_build_bucket(
        bucket_dir: &Path,
        index: u8,
        timeout: Duration,
        entry_listener: Option<EntryListener>,
    ) -> Result<NpmBucketStore> {
        let bucket_name = format!("bucket_{}.stgz", index);
        let file_path = bucket_dir.join(&bucket_name);
        let bucket_file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(file_path)
            .await?;
        let position = bucket_file.metadata().await?.len();
        let bucket = NpmBucketStore::new_with_entry_listener(
            bucket_name,
            bucket_file,
            position,
            timeout,
            entry_listener,
        )
        .await?;
        Ok(bucket)
    }

    pub async fn create_package_request<R: AsyncRead + Send + Sync + Unpin + 'static>(
        &self,
        request: PackageRequest,
        reader: R,
    ) -> PoolRequest<NpmBucketStore> {
        self.buckets
            .create_request(NpmBucketStoreExecuteCommand {
                request,
                reader: Box::new(reader),
            })
            .await
    }

    pub async fn notify_package(
        &self,
        bucket_name: &str,
        pkg_name: &str,
        toc_index: TocIndex,
    ) -> Result<()> {
        if let Some(entry_listener) = &self.entry_listener {
            let file_path = self.bucket_dir.join(&bucket_name);
            let mut bucket_file = OpenOptions::new()
                .create(false)
                .append(false)
                .read(true)
                .open(file_path)
                .await?;
            for entry in &toc_index.entries {
                if entry_listener.should_send_entry(&entry.name) {
                    bucket_file.seek(SeekFrom::Start(entry.offset)).await?;
                    let size = entry.size as usize;
                    let mut buf: Vec<u8> = Vec::with_capacity(size);
                    buf.resize(size, 0);
                    bucket_file.read_exact(&mut buf).await?;
                    let reader = AsyncReadVec { inner: buf };
                    entry_listener
                        .send_entry(PackageEntry {
                            pkg_name: String::from(pkg_name),
                            entry_name: String::from(entry.name.to_str().unwrap()),
                            reader: Box::new(reader),
                        })
                        .await;
                }
            }
        }
        Ok(())
    }

    pub async fn add_package<R: AsyncRead + Send + Sync + Unpin + 'static>(
        &self,
        request: PackageRequest,
        reader: R,
    ) -> Result<NpmBucketStoreExecuteResult> {
        let request = self.create_package_request(request, reader).await;
        request.execute().await
    }

    pub async fn shutdown(self) -> Result<()> {
        let NpmStore {
            buckets,
            mut entry_listener,
            ..
        } = self;
        let buckets = buckets.into_inner()?;
        let handlers: Vec<JoinHandle<Result<()>>> = buckets
            .into_iter()
            .map(|mut bucket| tokio::spawn(async move { bucket.shutdown().await }))
            .collect();
        try_join_all(handlers).await?;
        if let Some(listener) = entry_listener.take() {
            listener.shutdown().await;
        }
        Ok(())
    }
}

#[cfg(test)]
mod test {
    use crate::meta::PackageRequestBuilder;
    use crate::store::store::NpmStore;
    use std::path::Path;
    use std::time::Duration;
    use tokio::fs::OpenOptions;

    #[tokio::test]
    async fn download_test() {
        let bucket_dir = "/tmp/buckets";
        let current_dir = std::env::current_dir().unwrap();
        let store = NpmStore::new(3, Path::new(bucket_dir), Duration::from_secs(10), None)
            .await
            .unwrap();
        let pkg_readers = [(
            PackageRequestBuilder::new()
                .name("acorn")
                .version("8.7.1")
                .sha("mock_sha")
                .url("mock_url")
                .build()
                .unwrap(),
            OpenOptions::new()
                .create(false)
                .append(false)
                .read(true)
                .write(false)
                .open(current_dir.join("test/fixtures/tar/acorn-8.7.1.tgz"))
                .await
                .unwrap(),
        )];
        let mut result = Vec::new();
        for (pkg_request, reader) in pkg_readers {
            result.push(store.add_package(pkg_request, reader).await);
        }
        let result = &result[0];
        assert!(result.is_ok());
        // let result = result.unwrap();
        // assert_eq!(result.entries.len(), 3);
        // for result in result {
        //     assert!(result.is_ok());
        // }
        // assert_eq!(indices.len(), 3);
    }
}
