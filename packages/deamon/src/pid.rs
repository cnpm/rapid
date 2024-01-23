use super::config::ProjectConfig;
use anyhow::Result;
use log::{debug, error, info};
use nix::sys::signal::{self, Signal};
use nix::unistd;
use std::sync::Arc;
use std::{collections::BTreeMap, process::Command};
use tokio::{
    sync::Mutex,
    time::{timeout, Duration},
};

#[derive(Debug, PartialEq, Eq)]
pub struct ProjectInfo {
    pub config: ProjectConfig,
    pub pids: Vec<u32>,
}

impl ProjectInfo {
    pub fn kill_pids(&mut self) {
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
                    error!("Failed to kill process with PID {}. Error: {:?}", pid, err);
                }
            }
        }

        self.pids = vec![];
    }

    async fn restart(&mut self) {
        match self.config.restart().await {
            Ok(pids) => {
                info!(
                    "restart project path {}, pids: {:?}",
                    self.config.get_project_path(),
                    pids
                );
                self.pids = pids;
            }
            Err(err) => {
                error!(
                    "Failed to restart project path {}. Error: {:?}",
                    self.config.get_project_path(),
                    err
                );
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
        let _ = check_project(project.1).await;
    }

    Ok(())
}

async fn check_project(project: &mut ProjectInfo) -> Result<()> {
    info!(
        "{:?} checking, pids is {:?}",
        project.config.get_project_path(),
        &project.pids
    );
    if (&project.pids).len() == 0 {
        project.restart().await;
    } else if !is_alive(&project.pids, project.config.get_project_path()).await {
        info!("{:?} will be check", project.config.get_project_path());
        project.kill_pids();
        project.restart().await;
    }

    Ok(())
}

async fn is_alive(pids: &Vec<u32>, directory_path: &str) -> bool {
    let mut is_pid_alive = true;
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

    if !is_pid_alive {
        return false;
    }

    match timeout(Duration::from_secs(1), read_directory(directory_path)).await {
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

async fn read_directory(path: &str) -> Result<Vec<std::fs::DirEntry>> {
    let entries = std::fs::read_dir(path)?
        .filter_map(|entry| entry.ok()) // Ignore potential errors
        .collect();

    Ok(entries)
}
