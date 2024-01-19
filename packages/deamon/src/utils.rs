use anyhow::Result;
use log::info;
use regex::Regex;
use std::fs::File;
use std::io;
use std::process::{Command, Output};

pub fn get_ps_snapshot() -> Result<String> {
    let ps_output = Command::new("ps").arg("aux").output()?;

    let ps_output_str = String::from_utf8_lossy(&ps_output.stdout).to_string();
    Ok(ps_output_str)
}

pub async fn create_folder_if_not_exists(folder_path: &str) -> Result<()> {
    if !tokio::fs::metadata(folder_path).await.is_ok() {
        tokio::fs::create_dir_all(folder_path).await?;
        info!("Folder created: {}", folder_path);
    } else {
        info!("Folder already exists: {}", folder_path);
    }

    Ok(())
}

pub fn split_args(comm: &str) -> (String, Option<String>) {
    let split_comm: Vec<_> = comm.splitn(2, ' ').collect();

    if split_comm.len() > 1 {
        let cleaned_str = Regex::new(r#"\\[\s]*\n"#)
            .unwrap()
            .replace_all(split_comm[1], " ");
        let arg = Regex::new(r#"\s+"#).unwrap().replace_all(&cleaned_str, " ");
        return (split_comm[0].to_string(), Some(arg.to_string()));
    }

    (split_comm[0].to_string(), None)
}

pub fn start_command(comm: &str) -> io::Result<Output> {
    let (com, args) = split_args(comm);

    let mut command = Command::new(&com);

    match args {
        Some(arg) => {
            command.args(arg.split(' ').collect::<Vec<&str>>());
        }
        _ => (),
    };
    command.output()
}

pub fn check_and_create_file(file_path: &str) -> io::Result<File> {
    if !std::path::Path::new(file_path).exists() {
        let file = File::create(file_path)?;

        return Ok(file);
    } else {
        let file = File::open(file_path)?;
        return Ok(file);
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_split_args() {
        let (command, args) = split_args("echo Hello World");
        assert_eq!(command, "echo");
        assert_eq!(args, Some("Hello World".to_string()));

        let (command, args) = split_args("ls");
        assert_eq!(command, "ls");
        assert_eq!(args, None);

        let (command, args) = split_args("echo \"Hello World\"");
        assert_eq!(command, "echo");
        assert_eq!(args, Some("\"Hello World\"".to_string()));
    }

    #[tokio::test]
    async fn test_start_command() {
        match start_command("echo Hello World") {
            Ok(output) => {
                assert!(output.status.success());

                assert!(String::from_utf8_lossy(&output.stdout).contains("Hello World"));
            }
            Err(err) => {
                eprintln!("Error running command: {:?}", err);
                assert!(false);
            }
        }
    }
}
