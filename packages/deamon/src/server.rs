use std::{collections::BTreeMap, sync::Arc};

use anyhow::{anyhow, Result};
use axum::{
    routing::{get, post},
    Router,
};
use hyper::{Body, Request, Response};
use log::{error, info};
use serde::Deserialize;
use std::convert::Infallible;
use tokio::sync::Mutex;

use crate::{
    config::ProjectConfig,
    pid::{init_project, ProjectInfo},
};

async fn handle_add(
    req: Request<Body>,
    project_tree: Arc<Mutex<BTreeMap<String, ProjectInfo>>>,
) -> Result<Response<Body>, Infallible> {
    if req.uri().path() == "/add-project" && req.method() == hyper::Method::POST {
        let body_bytes = hyper::body::to_bytes(req.into_body()).await.unwrap();
        let body_str = String::from_utf8_lossy(&body_bytes);

        let config: ProjectConfig = serde_json::from_str(&body_str.to_string()).unwrap();

        info!("handle add project path is {}", config.get_project_path());

        match init_project(config, project_tree).await {
            Ok(_) => Ok(Response::builder()
                .status(200)
                .body(Body::from("add project config success!"))
                .unwrap()),
            Err(e) => Ok(Response::builder()
                .status(200)
                .body(Body::from(format!(
                    "add project config fail, err is {:?}",
                    e
                )))
                .unwrap()),
        }
    } else {
        Ok(Response::builder()
            .status(404)
            .body(Body::from("add project config fail"))
            .unwrap())
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DelReq {
    project_path: String,
}

async fn handle_del(
    req: Request<Body>,
    project_tree: Arc<Mutex<BTreeMap<String, ProjectInfo>>>,
) -> Result<Response<Body>, Infallible> {
    if req.uri().path() == "/del-project" && req.method() == hyper::Method::POST {
        let body_bytes = hyper::body::to_bytes(req.into_body()).await.unwrap();
        let body_str = String::from_utf8_lossy(&body_bytes);

        let request: DelReq = serde_json::from_str(&body_str.to_string()).unwrap();

        info!("handle del project path is {}", request.project_path);

        let mut project_tree = project_tree.lock().await;

        if let Some(mut project) = project_tree.remove(&request.project_path) {
            project.kill_pids();
        }

        Ok(Response::builder()
            .status(200)
            .body(Body::from("del project config success!"))
            .unwrap())
    } else {
        Ok(Response::builder()
            .status(404)
            .body(Body::from("del project config fail"))
            .unwrap())
    }
}

async fn handle_alive(req: Request<Body>) -> Result<Response<Body>, Infallible> {
    if req.uri().path() == "/alive" && req.method() == hyper::Method::GET {
        Ok(Response::builder()
            .status(200)
            .body(Body::from("deamon is alive"))
            .unwrap())
    } else {
        Ok(Response::builder()
            .status(404)
            .body(Body::from("deamon is alive"))
            .unwrap())
    }
}

pub async fn start_server(project_tree: Arc<Mutex<BTreeMap<String, ProjectInfo>>>) {
    let app = {
        let project_tree = project_tree.clone();
        Router::new().route(
            "/add-project",
            post(move |req| handle_add(req, project_tree)),
        )
    };
    let app = {
        let project_tree = project_tree.clone();
        app.route(
            "/del-project",
            post(move |req| handle_del(req, project_tree)),
        )
        .route("/alive", get(move |req| handle_alive(req)))
    };

    axum::Server::bind(&"0.0.0.0:33889".parse().unwrap())
        .serve(app.into_make_service())
        .await
        .expect("Server failed");
}

#[cfg(test)]
mod test {

    use hyper::{body::to_bytes, StatusCode};

    use super::*;

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
        let request = Request::builder()
            .method("POST")
            .uri("/del-project")
            .header("Content-Type", "application/json")
            .body(Body::from(r#"{"projectPath":"mock_project"}"#))
            .unwrap();

        let response = handle_del(request, tree.clone()).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let tree_config = tree.lock().await;

        assert_eq!(tree_config.get("mock_project"), None);
    }

    #[tokio::test]
    async fn test_handle_add() {
        let tree = create_mock_tree().await;
        let request = Request::builder()
            .method("POST")
            .uri("/add-project")
            .header("Content-Type", "application/json")
            .body(Body::from(r#"{"projectName":"mock_project","projectPath":"test_project","bootstraps":[],"nydusdApiMount":[],"overlays":[]}"#))
            .unwrap();

        let response = handle_add(request, tree.clone()).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let binding = to_bytes(response.into_body()).await.unwrap();
        let body = String::from_utf8_lossy(&binding);
        assert_eq!(
            body.to_string(),
            r#"add project config success!"#.to_string()
        );
    }

    #[tokio::test]
    async fn test_handle_alive() {
        let request = Request::builder()
            .method("GET")
            .uri("/alive")
            .body(Body::from(""))
            .unwrap();

        let response = handle_alive(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let binding = to_bytes(response.into_body()).await.unwrap();
        let body = String::from_utf8_lossy(&binding);
        assert_eq!(body.to_string(), r#"deamon is alive"#.to_string());
    }
}
