use std::{collections::BTreeMap, convert::Infallible, path::PathBuf, sync::Arc};

use anyhow::Result;
use axum::{
    extract::{connect_info, State},
    http::{Request, StatusCode},
    response::Json,
    routing::{get, post},
    Router,
};
use hyper_util::{
    rt::{TokioExecutor, TokioIo},
    server,
};
use hyper_v1::body::Incoming;
use log::{error, info};
use serde::{Deserialize, Serialize};
use tokio::{
    net::{unix::UCred, UnixListener, UnixStream},
    sync::{mpsc::Sender, Mutex},
};
use tower::Service;

use crate::{
    config::ProjectConfig,
    pid::{add_project, ProjectInfo},
};

#[derive(Serialize, Deserialize)]
struct Res {
    code: i32,
    msg: String,
}

struct RouteState {
    pub project_tree: Arc<Mutex<BTreeMap<String, ProjectInfo>>>,
    pub sender: Arc<Mutex<Sender<usize>>>,
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
        // project.kill_pids();
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
    let sender = state.sender.lock().await;
    match sender.send(0).await {
        Ok(_) => Ok(Json(Res {
            code: 0,
            msg: format!("deamon be killed"),
        })),
        Err(e) => Ok(Json(Res {
            code: -1,
            msg: format!("deamon kill err {:?}", e),
        })),
    }
}

fn app(
    project_tree: Arc<Mutex<BTreeMap<String, ProjectInfo>>>,
    sender: Arc<Mutex<Sender<usize>>>,
) -> Router {
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

#[derive(Clone, Debug)]
#[allow(dead_code)]
struct UdsConnectInfo {
    peer_addr: Arc<tokio::net::unix::SocketAddr>,
    peer_cred: UCred,
}

impl connect_info::Connected<&UnixStream> for UdsConnectInfo {
    fn connect_info(target: &UnixStream) -> Self {
        let peer_addr = target.peer_addr().unwrap();
        let peer_cred = target.peer_cred().unwrap();

        Self {
            peer_addr: Arc::new(peer_addr),
            peer_cred,
        }
    }
}

fn unwrap_infallible<T>(result: Result<T, Infallible>) -> T {
    match result {
        Ok(value) => value,
        Err(err) => {
            error!("unwrap_infallible err {:?}", err);
            match err {}
        }
    }
}

pub async fn start_server(
    project_tree: Arc<Mutex<BTreeMap<String, ProjectInfo>>>,
    sender: Sender<usize>,
    socket_path: PathBuf,
) {
    let sender = Arc::new(Mutex::new(sender));
    let app = app(project_tree, sender.clone());

    let _ = tokio::fs::remove_file(&socket_path).await;

    let uds = match UnixListener::bind(socket_path.clone()) {
        Ok(uds) => uds,
        Err(e) => {
            error!("create uds error: {:?}", e);
            sender.lock().await.send(0).await;
            return;
        }
    };

    let mut make_service = app.into_make_service_with_connect_info::<UdsConnectInfo>();

    loop {
        let (socket, _remote_addr) = uds.accept().await.unwrap();

        let tower_service = unwrap_infallible(make_service.call(&socket).await);

        tokio::spawn(async move {
            let socket = TokioIo::new(socket);

            let hyper_service = hyper_v1::service::service_fn(move |request: Request<Incoming>| {
                tower_service.clone().call(request)
            });

            if let Err(err) = server::conn::auto::Builder::new(TokioExecutor::new())
                .serve_connection_with_upgrades(socket, hyper_service)
                .await
            {
                eprintln!("failed to serve connection: {err:#}");
            }
        });
    }
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
        let sender = Arc::new(Mutex::new(sender));
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
        let sender = Arc::new(Mutex::new(sender));
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
        let sender = Arc::new(Mutex::new(sender));
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
        let sender = Arc::new(Mutex::new(sender));
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
