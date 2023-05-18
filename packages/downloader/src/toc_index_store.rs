use crate::TocIndex;
use super::error::{Result, Error};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fmt::format;
use std::fs::File;
use std::io::Read;
use std::ops::Range;
use std::sync::Mutex;
use std::path::Path;

pub type TocMap = HashMap<String /* tarName */, TocIndex>;
pub type TocIndicesMap =
    HashMap<String /* packageName */, HashMap<String /* tarName */, Range<usize>>>;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TocIndexStoreData {
    pub toc_map: TocMap,
    pub indices: TocIndicesMap,
}

#[derive(Clone)]
struct TocIndexStoreInner {
    toc_map: TocMap,
    indices: TocIndicesMap,
}

impl TocIndexStoreInner {
    fn new() -> Self {
        TocIndexStoreInner {
            toc_map: HashMap::new(),
            indices: HashMap::new(),
        }
    }
}

pub struct TocIndexStore {
    inner: Mutex<TocIndexStoreInner>,
}

impl TocIndexStore {
    pub fn new() -> Self {
        TocIndexStore {
            inner: Mutex::new(TocIndexStoreInner::new()),
        }
    }

    pub fn restore_from_file<P: AsRef<Path>>(map_path: P, index_path: P) -> Result<Self> {
        let map_file = File::open(map_path)?;
        let map: TocMap = serde_json::from_reader(map_file).map_err(|e| {
            Error::FormatError(String::from("parse toc map file failed"))
        })?;

        let index_file = File::open(index_path)?;
        let index = serde_json::from_reader(index_file).map_err(|e| {
            Error::FormatError(String::from("parse toc index file failed"))
        })?;
        Ok(TocIndexStore::restore(map, index))
    }

    pub fn restore(toc_map: TocMap, indices: TocIndicesMap) -> Self {
        TocIndexStore {
            inner: Mutex::new(TocIndexStoreInner { toc_map, indices }),
        }
    }

    pub fn has_package(&self, name: &str, version: &str) -> bool {
        let mut inner = self.inner.lock().expect("toc index store lock failed");
        let id = TocIndexStore::package_id(name, version);
        inner.indices.contains_key(&id)
    }

    pub fn add_package(&self, name: &str, version: &str, blob_id: &str, mut toc_index: TocIndex) {
        let pkg_entry_count = toc_index.entries.len();
        let index_start = self.add_package_toc(blob_id, toc_index);
        self.add_package_index(
            name,
            version,
            blob_id,
            index_start..index_start + pkg_entry_count,
        );
    }

    pub fn dump(&self) -> TocIndexStoreData {
        let inner = self.inner.lock().expect("toc index store lock failed");
        TocIndexStoreData {
            toc_map: inner.toc_map.clone(),
            indices: inner.indices.clone(),
        }
    }

    fn add_package_toc(&self, blob_id: &str, mut toc_index: TocIndex) -> usize {
        let mut inner = self.inner.lock().expect("toc index store lock failed");
        if let Some(exits_toc_index) = inner.toc_map.get_mut(blob_id) {
            let cur_len = exits_toc_index.entries.len();
            exits_toc_index.entries.append(&mut toc_index.entries);
            cur_len
        } else {
            inner.toc_map.insert(String::from(blob_id), toc_index);
            0
        }
    }

    fn add_package_index(&self, name: &str, version: &str, blob_id: &str, range: Range<usize>) {
        let mut inner = self.inner.lock().expect("toc index store lock failed");
        let id = TocIndexStore::package_id(name, version);
        if let Some(index_map) = inner.indices.get_mut(&id) {
            index_map.insert(String::from(blob_id), range);
        } else {
            let mut index_map = HashMap::new();
            index_map.insert(String::from(blob_id), range);
            inner.indices.insert(id, index_map);
        }
    }

    fn package_id(name: &str, version: &str) -> String {
        format!("{}@{}", name, version)
    }
}
