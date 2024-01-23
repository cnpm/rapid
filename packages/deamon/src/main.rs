#[macro_use]
extern crate lazy_static;

use anyhow::Result;
use config::{process_json_files_in_folder, NydusConfig};
use homedir::get_my_home;
use pid::{check_projects, init_projects};
use server::start_server;
use utils::create_folder_if_not_exists;

mod config;
mod pid;
mod server;
mod utils;

fn setup_logger() -> Result<()> {
    let log_dir = get_my_home()
        .unwrap()
        .unwrap()
        .join(".rapid/cache/project/logs/");

    create_folder_if_not_exists(log_dir.to_str().unwrap()).unwrap();

    let log_config_path = get_my_home()
        .unwrap()
        .unwrap()
        .join(".rapid/cache/project/log4rs.yaml");

    log4rs::init_file(log_config_path, Default::default()).unwrap();

    Ok(())
}

#[tokio::main]
async fn main() {
    let cache_dir = get_my_home()
        .unwrap()
        .unwrap()
        .join(".rapid/cache/project/");

    create_folder_if_not_exists(cache_dir.to_str().unwrap()).unwrap();

    let metadata_dir = get_my_home()
        .unwrap()
        .unwrap()
        .join(".rapid/cache/project/metadata/");

    let _ = setup_logger();

    create_folder_if_not_exists(metadata_dir.to_str().unwrap()).unwrap();

    let configs = process_json_files_in_folder(metadata_dir.to_str().unwrap())
        .await
        .unwrap();

    let nydus = NydusConfig::new().await;
    let _ = nydus.init_daemon();

    let project_tree = init_projects(configs).await.unwrap();

    {
        let project_tree = project_tree.clone();
        std::thread::spawn(move || {
            tokio::runtime::Runtime::new()
                .unwrap()
                .block_on(start_server(project_tree.clone()));
        });
    }

    println!("deamon main is ready");

    loop {
        let _ = nydus.init_daemon();
        let _ = check_projects(project_tree.clone()).await;
        tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
    }
}
