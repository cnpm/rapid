use super::config::ProjectConfig;
use anyhow::Result;
use futures::future::join_all;
use log::error;
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
            match signal::kill(unistd::Pid::from_raw(pid.clone() as i32), Signal::SIGKILL) {
                Ok(_) => {}
                Err(err) => {
                    error!("Failed to kill process with PID {}. Error: {:?}", pid, err);
                }
            }
        }

        self.pids = vec![];
    }

    fn restart(&mut self) {
        match self.config.restart() {
            Ok(pids) => {
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
    let mut handles = vec![];
    for project in projects.into_iter() {
        handles.push(init_project(project, lock_map.clone()));
    }

    let _ = join_all(handles).await;

    Ok(lock_map)
}

pub async fn init_project(
    project: ProjectConfig,
    process_map: Arc<Mutex<BTreeMap<String, ProjectInfo>>>,
) -> Result<()> {
    let pids = project.restart()?;
    process_map.lock().await.insert(
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
        let _ = check_project(project.1).await;
    }

    Ok(())
}

async fn check_project(project: &mut ProjectInfo) -> Result<()> {
    if !is_alive(&project.pids, project.config.get_project_path()).await {
        project.kill_pids();
        project.restart();
    }

    Ok(())
}

async fn is_alive(pids: &Vec<u32>, directory_path: &str) -> bool {
    let mut is_pid_alive = true;

    for pid in pids.iter() {
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
            Err(_) => false,
        },
        Err(_) => false,
    }
}

async fn read_directory(path: &str) -> Result<Vec<std::fs::DirEntry>> {
    let entries = std::fs::read_dir(path)?
        .filter_map(|entry| entry.ok()) // Ignore potential errors
        .collect();

    Ok(entries)
}
