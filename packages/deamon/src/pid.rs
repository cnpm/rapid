use super::config::ProjectConfig;
use crate::utils::list_mount_info;
use anyhow::{anyhow, Result};
use log::{debug, error, info};
use nix::sys::signal::{self, Signal};
use nix::unistd;
use std::sync::Arc;
use std::{collections::BTreeMap, process::Command};
use tokio::{
    fs::read_dir,
    sync::Mutex,
    time::{timeout, Duration},
};

#[derive(Debug, PartialEq, Eq)]
pub struct ProjectInfo {
    pub config: ProjectConfig,
    pub pids: Vec<u32>,
}

impl ProjectInfo {
    pub fn kill_pids(&mut self) -> Result<()> {
        for pid in self.pids.iter() {
            info!(
                "{:?} be killing, project path {}",
                pid,
                self.config.get_project_path()
            );
            match signal::kill(unistd::Pid::from_raw(pid.clone() as i32), Signal::SIGKILL) {
                Ok(_) => {
                    info!(
                        "{:?} killed, project path {}",
                        pid,
                        self.config.get_project_path()
                    );
                }
                Err(err) => {
                    return Err(anyhow!(
                        "Failed to kill process with PID {}. Error: {:?}",
                        pid,
                        err
                    ));
                }
            }
        }

        self.pids = vec![];

        Ok(())
    }

    async fn restart(&mut self) -> Result<()> {
        match self.config.restart().await {
            Ok(pids) => {
                info!(
                    "restart project path {}, pids: {:?}",
                    self.config.get_project_path(),
                    pids
                );
                self.pids = pids;
                return Ok(());
            }
            Err(err) => {
                return Err(anyhow!(
                    "Failed to restart project path {}. Error: {:?}",
                    self.config.get_project_path(),
                    err
                ));
            }
        };
    }
}

pub async fn init_projects(
    projects: Vec<ProjectConfig>,
) -> Result<Arc<Mutex<BTreeMap<String, ProjectInfo>>>> {
    let lock_map = Arc::new(Mutex::new(BTreeMap::new()));

    for project in projects.into_iter() {
        match add_project(project, lock_map.clone()).await {
            Ok(_) => continue,
            Err(e) => {
                error!("init_project error : {:?}", e);
            }
        };
    }

    Ok(lock_map)
}

pub async fn kill_projects(process_map: Arc<Mutex<BTreeMap<String, ProjectInfo>>>) -> Result<()> {
    let mut map = process_map.lock().await;

    for (_, info) in map.iter_mut() {
        info.kill_pids()?;
    }

    Ok(())
}

pub async fn init_project(
    project: ProjectConfig,
    process_map: Arc<Mutex<BTreeMap<String, ProjectInfo>>>,
) -> Result<()> {
    let pids = project.restart().await?;
    let mut map = process_map.lock().await;
    map.insert(
        project.get_project_path().to_string(),
        ProjectInfo {
            config: project,
            pids,
        },
    );
    Ok(())
}

pub async fn add_project(
    project: ProjectConfig,
    process_map: Arc<Mutex<BTreeMap<String, ProjectInfo>>>,
) -> Result<()> {
    let pids = project.get_pids()?;
    let mut map = process_map.lock().await;
    map.insert(
        project.get_project_path().to_string(),
        ProjectInfo {
            config: project,
            pids,
        },
    );
    Ok(())
}

// check all rapid project status
pub async fn check_projects(process_map: Arc<Mutex<BTreeMap<String, ProjectInfo>>>) -> Result<()> {
    let mut p_map = process_map.lock().await;

    for project in p_map.iter_mut() {
        info!("{:?} be checked", project.0);
        if let Err(e) = check_project(project.1).await {
            error!("project {} err: {}", project.0, e);
        }
    }

    Ok(())
}

async fn check_project(project: &mut ProjectInfo) -> Result<()> {
    info!(
        "{:?} checking, pids is {:?}",
        project.config.get_project_path(),
        &project.pids
    );

    if !is_alive(&project.pids, project.config.get_node_modules_paths()).await {
        info!("{:?} will be check", project.config.get_project_path());
        if let Err(e) = project.kill_pids() {
            error!(
                "project {} kill fail {}",
                project.config.get_project_path(),
                e
            )
        }
        project.restart().await?;
    }

    Ok(())
}

async fn is_alive(pids: &Vec<u32>, directory_path: Vec<String>) -> bool {
    let mut is_pid_alive = true;
    #[cfg(target_os = "linux")]
    for pid in pids.iter() {
        debug!("directory_path: {:?}, pid: {:?}", directory_path, pid);
        let output = Command::new("kill").arg("-0").arg(pid.to_string()).output();
        if output.is_ok() && output.unwrap().status.success() {
            continue;
        } else {
            is_pid_alive = false;
            break;
        }
    }

    #[cfg(target_os = "macos")]
    {
        match list_mount_info() {
            Ok(mounts) => {
                is_pid_alive = directory_path.iter().all(|item| mounts.contains(item));
            }
            Err(e) => {
                error!("list_mount_info error: {:?}", e);
            }
        }
    }

    if !is_pid_alive {
        return false;
    }
    info!("directory_path: {:?}, pids: {:?}", directory_path, pids);
    match timeout(Duration::from_secs(1), read_directorys(&directory_path)).await {
        Ok(result) => match result {
            Ok(_) => true,
            Err(e) => {
                error!("read {:?} result error, error is {:?}", directory_path, e);
                return false;
            }
        },
        Err(e) => {
            error!("read {:?} error, error is {:?}", directory_path, e);
            return false;
        }
    }
}

async fn read_directorys(paths: &Vec<String>) -> Result<Vec<tokio::fs::DirEntry>> {
    let mut entries = vec![];

    for path in paths {
        let mut dir = read_dir(path).await?;

        while let Some(entry) = dir.next_entry().await? {
            entries.push(entry);
        }
    }

    Ok(entries)
}
