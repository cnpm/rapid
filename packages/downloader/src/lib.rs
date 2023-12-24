pub mod channel;
pub mod download;
pub mod error;
pub mod http;
pub mod meta;
pub(crate) mod pool;
pub mod store;
mod test;
pub mod toc_index_store;
pub mod util;

use crate::download::{DownloadResponse, Downloader};
use crate::error::Result;
use crate::http::{HTTPPool, HTTPReqwester};
pub use crate::store::{NpmStore, TocIndex};

pub use meta::{PackageRequest, PackageRequestBuilder};
use nydus_bootstrap::bootstrap::{BlobIdTocIndex, BlobIdsTocIndexes, TocIndex as NewTocIndex};
use std::collections::{HashMap, HashSet};

use nydus_bootstrap::stargz::TocEntry;

use crate::store::listener::EntryListener;
use crate::toc_index_store::TocIndexStore;
use crate::util::MultiWriter;
use std::path::Path;
use std::sync::Arc;
use std::time::Duration;
use tokio;
use tokio::io::{AsyncRead, AsyncWrite};
use tokio::sync::mpsc::Sender;
use tokio::sync::Mutex;
use tokio::task::JoinHandle;

#[derive(Debug, Clone)]
pub struct TocPath {
    pub map: String,
    pub index: String,
}

#[derive(Debug, Clone)]
pub struct DownloadOptions {
    pub download_dir: String,
    pub bucket_count: u8,
    pub http_concurrent_count: u8,
    pub retry_time: u8,
    pub entry_listener: Option<EntryListener>,
    pub download_timeout: Duration,
    pub toc_path: Option<TocPath>,
    pub registries: Option<Vec<String>>,
}

pub async fn download(
    pkg_requests: Vec<PackageRequest>,
    opts: DownloadOptions,
) -> Result<HashMap<String, TocIndex<'static>>> {
    let DownloadOptions {
        http_concurrent_count,
        bucket_count,
        download_dir,
        entry_listener,
        download_timeout,
        retry_time,
        ..
    } = opts;

    let store = NpmStore::new(
        bucket_count,
        Path::new(&download_dir),
        download_timeout,
        entry_listener,
    )
    .await?;
    let http_pool = HTTPPool::new(http_concurrent_count, opts.registries)?;
    let toc_index_store = Arc::new(TocIndexStore::new());
    let mut downloader = Downloader::new(store, http_pool, toc_index_store.clone(), retry_time);
    downloader.batch_download(pkg_requests).await?;
    downloader.shutdown().await?;
    let toc_index_data = toc_index_store.dump();
    Ok(toc_index_data.toc_map)
}

#[cfg(test)]
mod test_downloader {
    use crate::{download, DownloadOptions, PackageRequest};
    use std::time::Duration;

    #[tokio::test]
    async fn test_downloader() {
        let req = vec![
            PackageRequest {
                name: "lodash".to_string(),
                version: "4.17.21".to_string(),
                sha: "mock_sha".to_string(),
                url: "http://127.0.0.1:8000/lodash-4.17.21.tgz".to_string(),
            },
            PackageRequest {
                name: "moment".to_string(),
                version: "2.29.4".to_string(),
                sha: "mock_sha".to_string(),
                url: "http://127.0.0.1:8000/moment-2.29.4.tgz".to_string(),
            },
        ];
        let result = download(
            req,
            DownloadOptions {
                download_dir: "/tmp/tar_buckets".to_string(),
                bucket_count: 1,
                http_concurrent_count: 1,
                download_timeout: Duration::from_secs(10),
                entry_listener: None,
                retry_time: 1,
                toc_path: None,
                registries: None,
            },
        )
        .await
        .unwrap();
        // assert_eq!(result.blobIds.capacity(), 1);
        // assert_eq!(result.entries.capacity(), 32);
    }
}
