use crate::http::ResponseStreamReader;
use crate::meta::PackageRequest;
use std::fmt::{Debug, Display};
use std::sync::Arc;

use crate::error::Error;
use crate::pool::{Pool, PoolError, PoolExecutorError};
use crate::store::{NpmBucketStoreExecuteCommand, NpmBucketStoreExecuteResult};
use crate::toc_index_store::TocIndexStore;
use crate::{HTTPPool, NpmStore, TocIndex};
use derivative::Derivative;
use log::{info, warn};
use tokio::io::AsyncRead;
use tokio::sync::mpsc;
use tokio::task::JoinHandle;

#[derive(Derivative)]
#[derivative(Debug)]
pub struct DownloadResponse {
    pub pkg_request: PackageRequest,
    #[derivative(Debug = "ignore")]
    pub reader: ResponseStreamReader,
}

pub struct Downloader {
    store: Arc<NpmStore>,
    http_pool: Arc<HTTPPool>,
    toc_index_store: Arc<TocIndexStore>,
    retry_time: u8,
}

impl<E: Display + Send + Sync + Unpin> From<PoolError<PackageRequest, E>> for Error {
    fn from(e: PoolError<PackageRequest, E>) -> Error {
        match e {
            PoolError::JoinError(e) => Error::BatchDownloadError(None),
            PoolError::BatchError(errs) => {
                let failed_list = errs
                    .into_iter()
                    .map(|e| match e {
                        PoolExecutorError::ExecuteError(r, e) => {
                            warn!("request {:?} failed {}", r, e);
                            r
                        }
                        PoolExecutorError::SendError(r) => {
                            warn!("send request {:?} result failed", r);
                            r
                        }
                    })
                    .collect();
                Error::BatchDownloadError(Some(failed_list))
            }
        }
    }
}

impl Downloader {
    pub fn new(
        store: NpmStore,
        http_pool: HTTPPool,
        toc_index_store: Arc<TocIndexStore>,
        retry_time: u8,
    ) -> Downloader {
        Downloader {
            store: Arc::new(store),
            http_pool: Arc::new(http_pool),
            toc_index_store,
            retry_time,
        }
    }

    pub async fn shutdown(self) -> Result<(), Error> {
        let store = match Arc::try_unwrap(self.store) {
            Ok(store) => store,
            Err(_) => return Err(Error::ArcBusy(String::from("downloader store is busy"))),
        };
        store.shutdown().await?;
        Ok(())
    }

    pub async fn batch_download(&self, requests: Vec<PackageRequest>) -> Result<(), Error> {
        let mut retry_time = 0u8;
        let max_retry_time = self.retry_time;
        let mut requests = requests;
        loop {
            match self.do_batch_download(requests).await {
                Ok(res) => return Ok(res),
                Err(e) => match e {
                    Error::BatchDownloadError(Some(failed_requests)) => {
                        if retry_time >= max_retry_time {
                            return Err(Error::BatchDownloadError(Some(failed_requests)));
                        }
                        warn!(
                            "download failed {:?} retry time {}",
                            &failed_requests, retry_time
                        );
                        requests = failed_requests;
                        retry_time += 1;
                    }
                    e => {
                        return Err(e);
                    }
                },
            }
        }
    }

    // err none 表示全部失败
    // err some 表示部分失败
    async fn do_batch_download(&self, requests: Vec<PackageRequest>) -> Result<(), Error> {
        let (response_sender, mut response_receiver) =
            mpsc::channel(self.store.bucket_size as usize * 2);
        let (store_request_sender, mut store_request_receiver) =
            mpsc::channel(self.store.bucket_size as usize * 2);
        let (store_sender, mut store_receiver) = mpsc::channel(self.store.bucket_size as usize);
        let http_pool = self.http_pool.clone();
        let (reuse_requests, download_requests): (Vec<PackageRequest>, Vec<PackageRequest>) =
            requests
                .into_iter()
                .partition(|r| self.toc_index_store.has_package(r.name(), r.version()));

        let toc_index_store = self.toc_index_store.clone();
        let store = self.store.clone();
        let reuse_handler: JoinHandle<Result<(), Error>> = tokio::spawn(async move {
            for request in reuse_requests.into_iter() {
                if let Some((bucket_name, toc_index)) =
                    toc_index_store.get_package(request.name(), request.version())
                {
                    store
                        .notify_package(&bucket_name, request.name(), toc_index)
                        .await?;
                } else {
                    return Err(Error::FormatError(format!(
                        "not found package {}@{} cache",
                        request.name(),
                        request.version()
                    )));
                }
            }
            Ok(())
        });

        let request_handler: JoinHandle<Result<(), Error>> = tokio::spawn(async move {
            http_pool
                .batch_execute(download_requests, response_sender)
                .await?;
            Ok(())
        });
        let map_handler: JoinHandle<Result<(), Error>> = tokio::spawn(async move {
            while let Some(DownloadResponse {
                pkg_request,
                reader,
            }) = response_receiver.recv().await
            {
                if let Err(_) = store_request_sender
                    .send(NpmBucketStoreExecuteCommand {
                        request: pkg_request,
                        reader: Box::new(reader) as Box<dyn AsyncRead + Send + Sync + Unpin>,
                    })
                    .await
                {
                    break;
                }
            }
            Ok(())
        });
        let store = self.store.clone();
        let store_handler: JoinHandle<Result<(), Error>> = tokio::spawn(async move {
            store
                .batch_execute(store_request_receiver, store_sender)
                .await?;
            Ok(())
        });
        let toc_index_store = self.toc_index_store.clone();
        let toc_store_handler: JoinHandle<Result<(), Error>> = tokio::spawn(async move {
            while let Some(NpmBucketStoreExecuteResult {
                toc_index,
                tar_name,
                pkg_request,
                ..
            }) = store_receiver.recv().await
            {
                toc_index_store.add_package(
                    pkg_request.name(),
                    pkg_request.version(),
                    &tar_name,
                    toc_index,
                );
            }
            Ok(())
        });
        request_handler.await??;
        map_handler.await??;
        info!("all request done");
        store_handler.await??;
        info!("all store done");
        toc_store_handler.await??;
        info!("all toc store done");
        reuse_handler.await??;
        info!("all reuse package done");
        Ok(())
    }

    pub async fn download_pkg(&self, request: PackageRequest) -> Result<(), Error> {
        if self
            .toc_index_store
            .has_package(&request.name, &request.version)
        {
            return Ok(());
        }
        let executor = self.http_pool.create_download_request(request).await;
        let DownloadResponse {
            pkg_request,
            reader,
        } = executor.execute().await?;
        let NpmBucketStoreExecuteResult {
            toc_index,
            tar_name,
            ..
        } = self.store.add_package(pkg_request.clone(), reader).await?;
        self.toc_index_store.add_package(
            pkg_request.name(),
            pkg_request.version(),
            &tar_name,
            toc_index,
        );
        Ok(())
    }
}

#[cfg(test)]
mod test {
    use crate::download::Downloader;
    use crate::http::HTTPPool;
    use crate::store::listener::EntryListener;
    use crate::toc_index_store::TocIndexStore;
    use crate::{NpmStore, PackageRequest};
    use std::fs::File;
    use std::os::unix::fs::MetadataExt;
    use std::path::Path;
    use std::sync::Arc;
    use std::time::Duration;
    use tokio::io::AsyncReadExt;
    use tokio::sync::mpsc;

    async fn create_downloader(
        toc_index_store: Arc<TocIndexStore>,
        bucket_path: &str,
        entry_listener: Option<EntryListener>,
    ) -> Downloader {
        let http_pool = HTTPPool::new(1).expect("create http pool failed");
        let store = NpmStore::new(
            1,
            Path::new(bucket_path),
            Duration::from_secs(5),
            entry_listener,
        )
        .await
        .expect("create store failed");
        Downloader::new(store, http_pool, toc_index_store, 1)
    }

    #[tokio::test]
    async fn should_not_download_exists_pkg() {
        // setup_logger();
        let toc_index_store = Arc::new(TocIndexStore::new());
        let downloader = create_downloader(
            toc_index_store.clone(),
            "/tmp/should_not_download_exists_pkg.stgz",
            None,
        )
        .await;
        // first download
        downloader
            .download_pkg(PackageRequest {
                name: String::from("umi"),
                version: String::from("4.0.7"),
                sha: String::from("mock_sha"),
                url: String::from("http://127.0.0.1:8000/umi-4.0.7.tgz"),
            })
            .await
            .expect("download pkg failed");
        downloader.shutdown().await.expect("shutdown failed");

        let bucket_file = File::open("/tmp/should_not_download_exists_pkg.stgz")
            .expect("open bucket file failed");
        let metadata = bucket_file
            .metadata()
            .expect("get bucket file metadata failed");
        let inode = metadata.ino();
        let modify_time = metadata.mtime();
        let bucket_size = metadata.len();

        let bucket_size = bucket_file
            .metadata()
            .expect("get bucket file metadata failed")
            .len();
        drop(bucket_file);

        // second download
        let downloader = create_downloader(
            toc_index_store.clone(),
            "/tmp/should_not_download_exists_pkg.stgz",
            None,
        )
        .await;
        downloader
            .download_pkg(PackageRequest {
                name: String::from("umi"),
                version: String::from("4.0.7"),
                sha: String::from("mock_sha"),
                url: String::from("http://127.0.0.1:8000/umi-4.0.7.tgz"),
            })
            .await
            .expect("download pkg failed");
        downloader.shutdown().await.expect("shutdown failed");

        let bucket_file = File::open("/tmp/should_not_download_exists_pkg.stgz")
            .expect("open bucket file failed");
        let new_metadata = bucket_file
            .metadata()
            .expect("get bucket file metadata failed");
        drop(bucket_file);

        // same file
        assert_eq!(inode, new_metadata.ino());
        // same size
        assert_eq!(bucket_size, new_metadata.len());
        // not modify file
        assert_eq!(modify_time, new_metadata.mtime());
    }

    #[tokio::test]
    async fn should_not_download_batch_exists_pkg() {
        // setup_logger();
        let toc_index_store = Arc::new(TocIndexStore::new());

        let downloader = create_downloader(
            toc_index_store.clone(),
            "/tmp/should_not_download_batch_exists_pkg.stgz",
            None,
        )
        .await;
        // first download
        downloader
            .batch_download(vec![PackageRequest {
                name: String::from("umi"),
                version: String::from("4.0.7"),
                sha: String::from("mock_sha"),
                url: String::from("http://127.0.0.1:8000/umi-4.0.7.tgz"),
            }])
            .await
            .expect("download pkg failed");
        downloader.shutdown().await.expect("shutdown failed");

        let bucket_file = File::open("/tmp/should_not_download_exists_pkg.stgz")
            .expect("open bucket file failed");
        let metadata = bucket_file
            .metadata()
            .expect("get bucket file metadata failed");
        let inode = metadata.ino();
        let modify_time = metadata.mtime();
        let bucket_size = metadata.len();

        let bucket_size = bucket_file
            .metadata()
            .expect("get bucket file metadata failed")
            .len();
        drop(bucket_file);

        // second download
        let (sx, mut rx) = mpsc::channel(10);
        let listener = EntryListener::new(vec![String::from("*/package.json")], Arc::new(sx));
        let receive_handler = tokio::spawn(async move {
            let mut msgs = Vec::new();
            while let Some(msg) = rx.recv().await {
                if let Some(msg) = msg {
                    msgs.push(msg);
                } else {
                    break;
                }
            }
            msgs
        });
        let downloader = create_downloader(
            toc_index_store.clone(),
            "/tmp/should_not_download_batch_exists_pkg.stgz",
            Some(listener),
        )
        .await;
        downloader
            .batch_download(vec![PackageRequest {
                name: String::from("umi"),
                version: String::from("4.0.7"),
                sha: String::from("mock_sha"),
                url: String::from("http://127.0.0.1:8000/umi-4.0.7.tgz"),
            }])
            .await
            .expect("download pkg failed");
        downloader.shutdown().await.expect("shutdown failed");

        let bucket_file = File::open("/tmp/should_not_download_exists_pkg.stgz")
            .expect("open bucket file failed");
        let new_metadata = bucket_file
            .metadata()
            .expect("get bucket file metadata failed");
        drop(bucket_file);

        // same file
        assert_eq!(inode, new_metadata.ino());
        // same size
        assert_eq!(bucket_size, new_metadata.len());
        // not modify file
        assert_eq!(modify_time, new_metadata.mtime());
        let mut msgs = receive_handler.await.unwrap();
        assert_eq!(msgs.len(), 1);
        let msg = &mut msgs[0];
        assert_eq!(msg.pkg_name, "umi");
        assert_eq!(msg.entry_name, "umi@4.0.7/package.json");
        let mut buf = Vec::new();
        msg.reader.read_to_end(&mut buf).await.unwrap();
        let mut content = String::from_utf8(buf).unwrap();
        assert_eq!(content.len(), 1492);
    }
}
