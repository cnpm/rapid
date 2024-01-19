use anyhow::{anyhow, Result};
use homedir::get_my_home;
use log::{error, info};
use regex::Regex;
use serde::Deserialize;
use serde_json::Error;
use std::{path::PathBuf, process::Command};

use crate::utils::{get_ps_snapshot, start_command};

// {
//     projectName: "",
//     bootstrap: {
//       projectPath: "",
//       stargzConfigPath:"",
//       stargzDir: "",
//       bootstrap: "",
//     },
//     nydusdApiMount: [
//       {
//         mountpoint: "",
//         socketPath: "", // string | null | undefined
//         bootstrap: "",
//         nydusdConfig: ""
//       }
//     ],
//     overlay: {
//       unionfs: "",
//       upper: "",
//       mnt: "",
//       nodeModulesDir: "",
//       workdir: "",
//     }
//   }

lazy_static! {
    static ref END_POINT: &'static str = "http://unix/api/v1";
    static ref MOUNT_URL: String = format!("{}/mount", END_POINT.to_string());
    static ref DAEMON_URL: String = format!("{}/daemon", END_POINT.to_string());
}

#[derive(Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct NydusdApiMount {
    mountpoint: String,
    socket_path: String,
    bootstrap: String,
    nydusd_config: String,
}

impl NydusdApiMount {
    pub fn restart(&self) -> Result<()> {
        let url = format!("{}?mountpoint={}", MOUNT_URL.to_string(), self.mountpoint);
        let str = format!(
            r#"curl --unix-socket {} \
            -X POST \
            -H "Content-Type: application/json" \
            -d '{{ "source": "{}", "fs_type": "rafs", "config": "{}" }}' -i \
            {}"#,
            self.socket_path, self.bootstrap, self.nydusd_config, url
        );

        match start_command(&str) {
            Ok(output) => {
                if output.status.success() {
                    info!(
                        "NydusdApiMount restart executed successfully, mountpoint: {:?}",
                        self.mountpoint
                    );
                    Ok(())
                } else {
                    return Err(anyhow!(
                        "Error executing NydusdApiMount restart: {:?}, mountpoint: {:?}",
                        output.status,
                        self.mountpoint
                    ));
                }
            }
            Err(e) => Err(anyhow!(
                "Error executing NydusdApiMount restart: {:?}, mountpoint: {:?}",
                e,
                self.mountpoint
            )),
        }
    }
}

#[derive(Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Overlay {
    unionfs: Option<String>,
    workdir: Option<String>,
    upper: String,
    mnt: String,
    node_modules_dir: String,
}

impl Overlay {
    pub fn restart(&self) -> Result<Vec<u32>> {
        #[cfg(target_os = "linux")]
        let str = format!(
            r#"mount \
            -t overlay overlay \
            -o lowerdir={},upperdir={},workdir={} \
            {}"#,
            self.mnt,
            self.upper,
            self.workdir.expect(&format!(
                "workdir is empty, node_modules_dir is {}",
                self.node_modules_dir
            )),
            self.node_modules_dir
        );
        #[cfg(target_os = "macos")]
        let unionfs = match &self.unionfs {
            Some(s) => s,
            None => {
                return Err(anyhow!(
                    "unionfs is empty, node_modules_dir is {}",
                    self.node_modules_dir
                ))
            }
        };
        #[cfg(target_os = "macos")]
        let str = format!(
            r#"{} \
            -o cow,max_files=32768 \
            -o allow_other,use_ino,suid,dev,nobrowse \
            {}=RW:{}=RO \
            {}"#,
            unionfs, self.upper, self.mnt, self.node_modules_dir
        );

        match start_command(&str) {
            Ok(output) => {
                if output.status.success() {
                    info!(
                        "Overlay restart executed successfully, mountpoint: {:?}",
                        self.node_modules_dir
                    );
                } else {
                    return Err(anyhow!(
                        "Error executing Overlay restart: {:?}, mountpoint: {:?}",
                        output.status,
                        self.node_modules_dir
                    ));
                }
            }
            Err(e) => {
                return Err(anyhow!(
                    "Error executing Overlay restart: {:?}, mountpoint: {:?}",
                    e,
                    self.node_modules_dir
                ));
            }
        }

        let mut pids = vec![];

        let snapshot = get_ps_snapshot()?;

        #[cfg(target_os = "linux")]
        let overlay_pattern = Regex::new(&format!(r#"(?i)overlay.*?{}"#, self.node_modules_dir))?;

        #[cfg(target_os = "macos")]
        let overlay_pattern =
            Regex::new(&format!(r#"(?i){}.*?{}"#, unionfs, self.node_modules_dir))?;

        for line in snapshot.clone().lines() {
            if overlay_pattern.is_match(line) {
                let fields: Vec<&str> = line.split_whitespace().collect();
                if fields.len() >= 11 {
                    let user = fields[0].to_string();
                    let pid = fields[1].parse::<u32>().unwrap_or(0);
                    let cpu = fields[2].to_string();
                    let command = fields[10].to_string();

                    pids.push(pid);
                }
            }
        }

        #[cfg(target_os = "macos")]
        let nfs_pattern = Regex::new(&format!(
            r#"(?i)/usr/local/bin/go-nfsv4.*?{}"#,
            self.node_modules_dir
        ))?;

        #[cfg(target_os = "macos")]
        for line in snapshot.clone().lines() {
            if nfs_pattern.is_match(line) {
                let fields: Vec<&str> = line.split_whitespace().collect();
                if fields.len() >= 11 {
                    let user = fields[0].to_string();
                    let pid = fields[1].parse::<u32>().unwrap_or(0);
                    let cpu = fields[2].to_string();
                    let command = fields[10].to_string();

                    pids.push(pid);
                }
            }
        }

        Ok(pids)
    }
}

#[derive(Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Bootstrap {
    bootstrap_bin: String,
    stargz_config_path: String,
    stargz_dir: String,
    bootstrap: String,
}

impl Bootstrap {
    pub fn restart(&self) -> Result<()> {
        let str = format!(
            "{} --stargz-config-path={} --stargz-dir={} --bootstrap={}",
            self.bootstrap_bin, self.stargz_config_path, self.stargz_dir, self.bootstrap
        );
        match start_command(&str) {
            Ok(output) => {
                if output.status.success() {
                    info!(
                        "bootstrap restart executed successfully, stargz_config_path: {:?}",
                        self.stargz_config_path
                    );
                    Ok(())
                } else {
                    return Err(anyhow!(
                        "Error executing bootstrap restart: {:?}, stargz_config_path: {:?}",
                        output.status,
                        self.stargz_config_path
                    ));
                }
            }
            Err(e) => Err(anyhow!(
                "Error executing bootstrap restart: {:?}, stargz_config_path: {:?}",
                e,
                self.stargz_config_path
            )),
        }
    }
}

#[derive(Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProjectConfig {
    project_name: String,
    project_path: String,
    bootstraps: Vec<Bootstrap>,
    nydusd_api_mount: Vec<NydusdApiMount>,
    overlays: Vec<Overlay>,
}

impl ProjectConfig {
    pub fn new(
        project_path: String,
        bootstraps: Vec<Bootstrap>,
        nydusd_api_mount: Vec<NydusdApiMount>,
        overlays: Vec<Overlay>,
    ) -> Self {
        Self {
            project_name: project_path.clone(),
            project_path,
            bootstraps,
            nydusd_api_mount,
            overlays,
        }
    }
    pub fn get_project_path(&self) -> &str {
        return &self.project_path;
    }

    pub fn restart(&self) -> Result<Vec<u32>> {
        for bootstrap in self.bootstraps.iter() {
            bootstrap.restart()?;
        }
        for mount in self.nydusd_api_mount.iter() {
            mount.restart()?;
        }

        let mut pids = vec![];

        for overlay in self.overlays.iter() {
            let ps = overlay.restart()?;
            pids.extend(ps);
        }

        Ok(pids)
    }
}

pub async fn process_json_files_in_folder(
    folder_path: &str,
) -> Result<Vec<ProjectConfig>, Box<dyn std::error::Error>> {
    let mut entries = tokio::fs::read_dir(folder_path).await?;

    let mut handles = vec![];

    while let Some(entry) = entries.next_entry().await? {
        if entry.file_type().await?.is_file() {
            let file_path = entry.path();

            if let Some(extension) = file_path.extension() {
                if extension == "json" {
                    let handle = tokio::spawn(read_json_file(file_path.clone()));
                    handles.push(handle);
                }
            }
        }
    }

    let mut results = vec![];

    for handle in handles {
        let res = handle.await??;
        results.push(res);
    }

    Ok(results)
}

async fn read_json_file(file_path: PathBuf) -> Result<ProjectConfig, Error> {
    let content = tokio::fs::read_to_string(&file_path).await.unwrap();
    let json_value: ProjectConfig = serde_json::from_str(&content)?;

    Ok(json_value)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NydusConfig {
    nydusd_bin: String,
    nydusd_config_file: String,
    nydusd_mnt: String,
    socket_path: String,
    nydusd_log_file: String,
}

impl NydusConfig {
    pub async fn new() -> Self {
        let content = tokio::fs::read_to_string(
            get_my_home()
                .unwrap()
                .unwrap()
                .join("/.rapid/cache/project/nydus_config.json"),
        )
        .await
        .unwrap();
        let json_value: NydusConfig = serde_json::from_str(&content).unwrap();
        json_value
    }
    pub fn init_daemon(&self) -> Result<()> {
        let str = format!(
            r#"curl -X GET \ 
        --unix-socket {} \
        {}"#,
            self.socket_path,
            DAEMON_URL.to_string()
        );
        match start_command(&str) {
            Ok(output) => {
                if output.status.success() {
                    info!("init_daemon executed successfully");
                    return Ok(());
                } else {
                    error!("Error executing init_daemon: {:?}", output.status);
                }
            }
            Err(e) => error!("Error executing init_daemon: {:?}", e),
        }

        #[cfg(target_os = "linux")]
        let mut command = Command::new("sudo");
        #[cfg(target_os = "macos")]
        let mut command = Command::new(&self.nydusd_bin);
        command.args([
            #[cfg(target_os = "linux")]
            &self.nydusd_bin,
            "--config",
            &self.nydusd_config_file,
            "--mountpoint",
            &self.nydusd_mnt,
            "--apisock",
            &self.socket_path,
            "--log-file",
            &self.nydusd_log_file,
        ]);
        let _ = command.output()?;
        Ok(())
    }
}
