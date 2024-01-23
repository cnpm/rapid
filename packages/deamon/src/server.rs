use std::{collections::BTreeMap, sync::Arc};

use anyhow::Result;
use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use log::info;
use serde::{Deserialize, Serialize};
use tokio::sync::{mpsc::Sender, Mutex};

use crate::{
    config::ProjectConfig,
    pid::{add_project, kill_projects, ProjectInfo},
};

#[derive(Serialize, Deserialize)]
struct Res {
    code: i32,
    msg: String,
}

struct RouteState {
    pub project_tree: Arc<Mutex<BTreeMap<String, ProjectInfo>>>,
    pub sender: Sender<usize>,
}

async fn handle_add(
    State(state): State<Arc<Mutex<RouteState>>>,
    Json(config): Json<ProjectConfig>,
) -> Result<Json<Res>, (StatusCode, String)> {
    let path = config.get_project_path().to_string();
    let state = state.lock().await;
    info!("handle add project path is {}", path);
    match add_project(config, state.project_tree.clone()).await {
        Ok(_) => Ok(Json(Res {
            code: 0,
            msg: format!("add project {} config success!", path),
        })),
        Err(e) => Ok(Json(Res {
            code: -1,
            msg: format!("add project {} config fail, err is {:?}", path, e),
        })),
    }
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
#[serde(rename_all = "camelCase")]
pub struct DelReq {
    project_path: String,
}

async fn handle_del(
    State(state): State<Arc<Mutex<RouteState>>>,
    Json(request): Json<DelReq>,
) -> Result<Json<Res>, (StatusCode, String)> {
    let state = state.lock().await;
    let mut project_tree = state.project_tree.lock().await;

    info!("handle del project path is {}", request.project_path);
    if let Some(mut project) = project_tree.remove(&request.project_path) {
        project.kill_pids();
    }

    Ok(Json(Res {
        code: 0,
        msg: format!("del project {} config success!", request.project_path),
    }))
}

async fn handle_alive() -> Result<Json<Res>, (StatusCode, String)> {
    info!("echo alive");
    Ok(Json(Res {
        code: 0,
        msg: format!("deamon is alive"),
    }))
}

async fn handle_kill(
    State(state): State<Arc<Mutex<RouteState>>>,
) -> Result<Json<Res>, (StatusCode, String)> {
    info!("echo kill");
    let state = state.lock().await;
    kill_projects(state.project_tree.clone()).await;
    let _ = state.sender.send(0).await;
    Ok(Json(Res {
        code: 0,
        msg: format!("deamon is alive"),
    }))
}

fn app(project_tree: Arc<Mutex<BTreeMap<String, ProjectInfo>>>, sender: Sender<usize>) -> Router {
    let state = RouteState {
        project_tree,
        sender,
    };
    Router::new()
        .route("/add-project", post(handle_add))
        .route("/del-project", post(handle_del))
        .route("/alive", get(handle_alive))
        .route("/kill", get(handle_kill))
        .with_state(Arc::new(Mutex::new(state)))
}

pub async fn start_server(
    project_tree: Arc<Mutex<BTreeMap<String, ProjectInfo>>>,
    sender: Sender<usize>,
) {
    let app = app(project_tree, sender);

    let mut port = 33889;

    const MAX_RETRIES: usize = 100;
    let mut retry_count = 0;

    let listener = loop {
        match tokio::net::TcpListener::bind(format!("127.0.0.1:{}", port)).await {
            Ok(listener) => {
                info!("deamon server is ready on port {}", port);
                break listener;
            }
            Err(_) => {
                info!("Port {} is already in use, trying the next one", port);
                port += 1;
                retry_count += 1;
                if retry_count >= MAX_RETRIES {
                    panic!("Exceeded maximum retry limit");
                }
            }
        }
    };

    println!("deamon server is ready");

    axum::serve(listener, app).await.expect("Server failed");
}

#[cfg(test)]
mod test {
    use super::*;
    use axum::{
        body::Body,
        http::{self, Request, StatusCode},
    };
    use http_body_util::BodyExt;
    use tower::ServiceExt;

    use tokio::sync::mpsc;

    async fn create_mock_tree() -> Arc<Mutex<BTreeMap<String, ProjectInfo>>> {
        let mut tree = BTreeMap::new();

        tree.insert(
            "mock_project".to_string(),
            ProjectInfo {
                config: ProjectConfig::new("mock_project".to_string(), vec![], vec![], vec![]),
                pids: vec![],
            },
        );

        Arc::new(Mutex::new(tree))
    }

    #[tokio::test]
    async fn test_handle_del() {
        let tree = create_mock_tree().await;
        let tree_config = tree.lock().await;
        assert_eq!(
            tree_config
                .get("mock_project")
                .unwrap()
                .config
                .get_project_path(),
            "mock_project"
        );
        drop(tree_config);

        let (sender, _) = mpsc::channel::<usize>(1);
        let app = app(tree.clone(), sender);

        let response = app
            .oneshot(
                Request::builder()
                    .method(http::Method::POST)
                    .uri("/del-project")
                    .header(http::header::CONTENT_TYPE, mime::APPLICATION_JSON.as_ref())
                    .body(Body::from(r#"{"projectPath":"mock_project"}"#))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let tree_config = tree.lock().await;

        assert_eq!(tree_config.get("mock_project"), None);
    }

    #[tokio::test]
    async fn test_handle_add() {
        let tree = create_mock_tree().await;

        let (sender, _) = mpsc::channel::<usize>(1);
        let app = app(tree.clone(), sender);

        let response = app
            .oneshot(
                Request::builder()
                    .method(http::Method::POST)
                    .uri("/add-project")
                    .header(http::header::CONTENT_TYPE, mime::APPLICATION_JSON.as_ref())
                    .body(Body::from(r#"{"projectName":"mock_project","projectPath":"test_project","bootstraps":[],"nydusdApiMount":[],"overlays":[]}"#))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let body: Res = serde_json::from_slice(&body).unwrap();
        assert_eq!(body.code, 0);
    }

    #[tokio::test]
    async fn test_handle_alive() {
        let tree = create_mock_tree().await;

        let (sender, _) = mpsc::channel::<usize>(1);
        let app = app(tree.clone(), sender);

        let response = app
            .oneshot(
                Request::builder()
                    .method(http::Method::GET)
                    .uri("/alive")
                    .body(Body::from(""))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let body: Res = serde_json::from_slice(&body).unwrap();
        assert_eq!(body.code, 0);
    }

    #[tokio::test]
    async fn test_handle_kill() {
        let tree = create_mock_tree().await;

        let (sender, mut receiver) = mpsc::channel::<usize>(1);
        let app = app(tree.clone(), sender);

        let response = app
            .oneshot(
                Request::builder()
                    .method(http::Method::GET)
                    .uri("/kill")
                    .body(Body::from(""))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let body: Res = serde_json::from_slice(&body).unwrap();
        assert_eq!(body.code, 0);
        let msg = receiver.recv().await.unwrap();
        assert_eq!(msg, 0);
    }
}
