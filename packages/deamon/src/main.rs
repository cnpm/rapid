#[macro_use]
extern crate lazy_static;

use anyhow::Result;
use config::{process_json_files_in_folder, NydusConfig};
use daemonize::Daemonize;
use homedir::get_my_home;
use pid::{check_projects, init_projects};
use server::start_server;
use utils::{check_and_create_file, create_folder_if_not_exists};

mod config;
mod pid;
mod server;
mod utils;

async fn setup_logger() -> Result<()> {
    let log_dir = get_my_home()
        .unwrap()
        .unwrap()
        .join("/.rapid/cache/project/logs/");

    create_folder_if_not_exists(log_dir.to_str().unwrap())
        .await
        .unwrap();

    let log_config_path = get_my_home()
        .unwrap()
        .unwrap()
        .join("/.rapid/cache/project/log4rs.yaml");

    log4rs::init_file(log_config_path, Default::default()).unwrap();

    Ok(())
}

#[tokio::main]
async fn main() {
    let cache_dir = get_my_home()
        .unwrap()
        .unwrap()
        .join("/.rapid/cache/project/");

    create_folder_if_not_exists(cache_dir.to_str().unwrap())
        .await
        .unwrap();

    let stdout = check_and_create_file(cache_dir.join("daemon.out").to_str().unwrap()).unwrap();
    let stderr = check_and_create_file(cache_dir.join("daemon.err").to_str().unwrap()).unwrap();

    let _ = check_and_create_file(cache_dir.join("test.pid").to_str().unwrap());

    let daemonize = Daemonize::new()
        .pid_file(cache_dir.join("test.pid").to_str().unwrap())
        .chown_pid_file(true)
        .working_directory(cache_dir.to_str().unwrap())
        .user("nobody")
        .group("daemon")
        .umask(0o777)
        .stdout(stdout)
        .stderr(stderr);

    match daemonize.start() {
        Ok(_) => {
            let cache_dir = get_my_home()
                .unwrap()
                .unwrap()
                .join("/.rapid/cache/project/metadata/");

            let _ = setup_logger().await;

            create_folder_if_not_exists(cache_dir.to_str().unwrap())
                .await
                .unwrap();

            let configs = process_json_files_in_folder(cache_dir.to_str().unwrap())
                .await
                .unwrap();

            let nydus = NydusConfig::new().await;

            let project_tree = init_projects(configs).await.unwrap();

            {
                let project_tree = project_tree.clone();
                std::thread::spawn(move || {
                    tokio::runtime::Runtime::new()
                        .unwrap()
                        .block_on(start_server(project_tree.clone()));
                });
            }

            loop {
                let _ = nydus.init_daemon();
                let _ = check_projects(project_tree.clone()).await;
                tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
            }
        }
        Err(e) => eprintln!("Error starting daemon: {}", e),
    }
}
