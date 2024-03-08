use anyhow::{anyhow, Result};
use homedir::get_my_home;
use hyper::{body::to_bytes, Body, Client, Request, StatusCode};
use hyperlocal::{UnixClientExt, Uri};
use log::{error, info};
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::Error;
use std::os::unix::fs::PermissionsExt;
use std::{path::PathBuf, process::Command};

use crate::utils::{create_dir_if_not_exists, del_dir_if_exists, get_ps_snapshot, start_command};

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
    nydusd_config: NydusdConfig,
    node_modules_dir: String,
}

#[derive(Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub struct NydusdConfig {
    rafs: NydusdRafsConfig,
    overlay: Option<NydusdOverlayConfig>,
}

#[derive(Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub struct NydusdOverlayConfig {
    upper_dir: String,
    work_dir: String,
}

#[derive(Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub struct NydusdRafsConfig {
    device: DeviceConfig,
    mode: String,
    digest_validate: bool,
    iostats_files: bool,
}

#[derive(Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub struct DeviceConfig {
    backend: Backend,
}

#[derive(Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub struct Backend {
    #[serde(rename = "type")]
    _type: String,
    config: BackendConfig,
}

#[derive(Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub struct BackendConfig {
    dir: String,
    readahead: bool,
}
#[derive(Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub struct NydusdApiMountReset {
    source: String,
    fs_type: String,
    config: String,
}

impl NydusdApiMount {
    fn get_reset_json(&self) -> Result<String> {
        let config = serde_json::to_string(&self.nydusd_config)?;
        let reset_struce = NydusdApiMountReset {
            source: self.bootstrap.clone(),
            fs_type: "rafs".to_string(),
            config: config.clone(),
        };

        Ok(serde_json::to_string(&reset_struce)?)
    }

    fn link_node_modules(&self) -> Result<()> {
        let str = format!(r#"umount -f {}"#, self.node_modules_dir);

        if let Err(e) = start_command(&str) {
            error!("Error executing umount: {:?}", e);
        }

        let str = format!(
            r#"mount -o port=52100,mountport=52100,vers=4,namedattr,rwsize=262144,nobrowse -t nfs fuse-t:/rafs-/{} {}"#,
            self.mountpoint, self.node_modules_dir
        );
        match start_command(&str) {
            Ok(output) => {
                if output.status.success() {
                    info!(
                        "link_node_modules success base {} target {}",
                        self.mountpoint, self.node_modules_dir
                    );
                    return Ok(());
                } else {
                    return Err(anyhow!(
                        "Error executing link_node_modules, status: {:?}, stdout: {:?}, stderr: {:?}, base {}, target {}",
                        output.status,
                        std::str::from_utf8(&output.stdout)?,
                        std::str::from_utf8(&output.stderr)?,
                        self.mountpoint,
                        self.node_modules_dir,
                    ));
                }
            }
            Err(e) => {
                return Err(anyhow!(
                    "Error executing link_node_modules: {:?}, base {}, target {}",
                    e,
                    self.mountpoint,
                    self.node_modules_dir
                ))
            }
        }
    }

    pub async fn restart(&self) -> Result<()> {
        del_dir_if_exists(self.node_modules_dir.clone())?;

        let url = Uri::new(
            &self.socket_path,
            &format!("/api/v1/mount?mountpoint=/{}", self.mountpoint),
        );

        let client = Client::unix();

        let request = Request::builder()
            .method("POST")
            .uri(url)
            .header("Content-Type", "application/json")
            .body(Body::from(self.get_reset_json()?))
            .unwrap();

        let response = client.request(request).await?;

        if (response.status() == StatusCode::OK) || (response.status() == StatusCode::NO_CONTENT) {
            #[cfg(target_os = "macos")]
            self.link_node_modules()?;
            return Ok(());
        }

        let binding = to_bytes(response.into_body()).await?;
        let body = String::from_utf8_lossy(&binding).to_string();

        if body.contains("object or filesystem already exists") {
            return Ok(());
        }

        return Err(anyhow!(
            "Error NydusdApiMount restart: {:?}, mountpoint: {:?}",
            body,
            self.mountpoint
        ));
    }
}

#[derive(Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Overlay {
    unionfs: Option<String>,
    workdir: String,
    upper: String,
    mnt: String,
    node_modules_dir: String,
    overlay: String,
}

impl Overlay {
    #[cfg(target_os = "macos")]
    pub fn get_pids(&self) -> Result<Vec<u32>> {
        let mut pids = vec![];

        let snapshot = get_ps_snapshot()?;

        let unionfs = match &self.unionfs {
            Some(s) => s,
            None => {
                return Err(anyhow!(
                    "unionfs is empty, node_modules_dir is {}",
                    self.node_modules_dir
                ))
            }
        };

        let overlay_pattern =
            Regex::new(&format!(r#"(?i){}.*?{}"#, unionfs, self.node_modules_dir))?;

        for line in snapshot.clone().lines() {
            if overlay_pattern.is_match(line) {
                let fields: Vec<&str> = line.split_whitespace().collect();
                if fields.len() >= 11 {
                    let _user = fields[0].to_string();
                    let pid = fields[1].parse::<u32>().unwrap_or(0);
                    let _cpu = fields[2].to_string();
                    let _command = fields[10].to_string();

                    pids.push(pid);
                }
            }
        }

        let nfs_pattern = Regex::new(&format!(
            r#"(?i)/usr/local/bin/go-nfsv4.*?{}"#,
            self.node_modules_dir
        ))?;

        for line in snapshot.clone().lines() {
            if nfs_pattern.is_match(line) {
                let fields: Vec<&str> = line.split_whitespace().collect();
                if fields.len() >= 11 {
                    let _user = fields[0].to_string();
                    let pid = fields[1].parse::<u32>().unwrap_or(0);
                    let _cpu = fields[2].to_string();
                    let _command = fields[10].to_string();

                    pids.push(pid);
                }
            }
        }

        Ok(pids)
    }

    #[cfg(target_os = "linux")]
    pub fn restart(&self) -> Result<Vec<u32>> {
        let unmount_modules_str = format!(r#"umount -f {}"#, self.node_modules_dir);

        let _ = start_command(&unmount_modules_str);

        let unmount_overlay_str = format!(r#"umount -f {}"#, self.overlay);

        let _ = start_command(&unmount_overlay_str);

        let tmp_str = format!(r#"mount -t tmpfs tmpfs {}"#, self.overlay);

        match start_command(&tmp_str) {
            Ok(output) => {
                if output.status.success() {
                    info!(
                        "Overlay restart executed successfully, mountpoint: {:?}, tmp_str: {:?}",
                        self.node_modules_dir, tmp_str
                    );
                } else {
                    return Err(anyhow!(
                        "Error executing Overlay restart: {:?}, mountpoint: {:?}, tmp_str: {:?}",
                        output.status,
                        self.node_modules_dir,
                        tmp_str
                    ));
                }
            }
            Err(e) => {
                return Err(anyhow!(
                    "Error executing Overlay restart command: {:?}, mountpoint: {:?}, tmp_str: {:?}",
                    e,
                    self.node_modules_dir,
                    tmp_str
                ));
            }
        }

        let mount_str = format!(
            r#"mount -t overlay overlay -o lowerdir={},upperdir={},workdir={} {}"#,
            self.mnt, self.upper, &self.workdir, self.node_modules_dir
        );
        match start_command(&mount_str) {
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
                    "Error executing Overlay restart command: {:?}, mountpoint: {:?}",
                    e,
                    self.node_modules_dir
                ));
            }
        }

        let res = vec![];
        Ok(res)
    }

    #[cfg(target_os = "macos")]
    pub fn restart(&self) -> Result<()> {
        create_dir_if_not_exists(self.overlay.clone())?;
        create_dir_if_not_exists(self.upper.clone())?;
        create_dir_if_not_exists(self.workdir.clone())?;
        std::fs::metadata(&self.upper)?
            .permissions()
            .set_mode(0o777);
        std::fs::metadata(&self.workdir)?
            .permissions()
            .set_mode(0o777);

        Ok(())
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
#[allow(dead_code)]
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

    pub fn get_node_modules_paths(&self) -> Vec<String> {
        self.nydusd_api_mount
            .iter()
            .map(|c| c.node_modules_dir.clone())
            .collect()
    }

    pub fn get_pids(&self) -> Result<Vec<u32>> {
        let mut pids = vec![];

        #[cfg(target_os = "macos")]
        for overlay in self.overlays.iter() {
            let ps = overlay.get_pids()?;
            pids.extend(ps);
        }
        return Ok(pids);
    }

    #[cfg(target_os = "linux")]
    pub async fn restart(&self) -> Result<Vec<u32>> {
        for bootstrap in self.bootstraps.iter() {
            bootstrap.restart()?;
        }
        for mount in self.nydusd_api_mount.iter() {
            mount.restart().await?;
        }

        let mut pids = vec![];

        for overlay in self.overlays.iter() {
            let ps = overlay.restart()?;
            pids.extend(ps);
        }

        Ok(pids)
    }

    #[cfg(target_os = "macos")]
    pub async fn restart(&self) -> Result<Vec<u32>> {
        use std::vec;

        for bootstrap in self.bootstraps.iter() {
            bootstrap.restart()?;
        }

        for overlay in self.overlays.iter() {
            overlay.restart()?;
        }

        for mount in self.nydusd_api_mount.iter() {
            mount.restart().await?;
        }

        Ok(vec![])
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
                .join(".rapid/cache/project/nydus_config.json"),
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
                    error!(
                        "Error executing init_daemon, status: {:?}, stdout: {:?}, stderr: {:?}",
                        output.status,
                        std::str::from_utf8(&output.stdout)?,
                        std::str::from_utf8(&output.stderr)?,
                    );
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
            "--log-level",
            "error",
            "--writable",
        ]);
        std::thread::spawn(move || {
            let _ = command.output();
        });
        Ok(())
    }
}
