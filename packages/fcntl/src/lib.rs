use fs2::{lock_contended_error, FileExt};
use std::fs::{self, File};
use std::io::Result;

pub struct Fcntl {
    file: File,
}

impl Fcntl {
    pub fn new(path: &str) -> Self {
        let file = fs::OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .open(&path)
            .unwrap();

        Self { file }
    }

    pub fn lock(&mut self) -> Result<()> {
        let res = self.file.try_lock_exclusive();
        match res {
            Err(msg) => {
                panic!("lock error, {:?}", msg)
            }
            Ok(msg) => Ok(()),
        }
    }

    pub fn unlock(&mut self) -> Result<()> {
        self.file.unlock()
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use std::fs;

    #[test]
    fn test_fcntl_no_panic() {
        let fp = "/tmp/a.txt";
        fs::remove_file(fp);

        let mut f = Fcntl::new(fp);
        let mut f2 = Fcntl::new(fp);
        f.lock();
        f.unlock();

        f2.lock();
        f2.unlock();
    }

    #[test]
    #[should_panic]
    fn test_fcntl() {
        let fp = "/tmp/b.txt";
        fs::remove_file(fp);

        let mut f = Fcntl::new(fp);
        let mut f2 = Fcntl::new(fp);
        f.lock();
        f2.lock();
    }
}
