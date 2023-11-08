use std::io::Result;

pub struct FsMeta {
    index: String,
    config: String,
    packageLock: PackageLock,
}

pub struct PackageLock {
    name: String,
    version: String,
}

pub struct FsMetaOptions {
    index: String,
    config: String,
    packageLock: PackageLock,
}

impl FsMeta {
    pub fn new() -> Self {
        Self {
            index: String::new(),
            config: String::new(),
            packageLock: PackageLock {
                name: String::new(),
                version: String::new(),
            },
        }
    }
    // pub fn new(options: FsMetaOptions) -> Self {
    //     let index = options.index;
    //     let config = options.config;
    //     let packageLock = options.packageLock;

    //     Self{
    //         config,
    //         index,
    //         packageLock
    //     }
    // }

    pub fn generate(&mut self, mode: String) -> Result<()> {
        let mode = mode.as_str();
        println!("Lets start from here: {}", mode);
        Ok(())
    }

}
