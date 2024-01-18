use std::{collections::BTreeMap, sync::Arc};

use anyhow::{anyhow, Result};
use axum::{routing::post, Router};
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

        let _ = init_project(config, project_tree).await;

        Ok(Response::builder()
            .status(200)
            .body(Body::from("add project config success!"))
            .unwrap())
    } else {
        Ok(Response::builder()
            .status(404)
            .body(Body::from("add project config fail"))
            .unwrap())
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct DelReq {
    project_path: String,
}

async fn handle_del(
    req: Request<Body>,
    project_tree: Arc<Mutex<BTreeMap<String, ProjectInfo>>>,
) -> Result<Response<Body>, Infallible> {
    if req.uri().path() == "/add-project" && req.method() == hyper::Method::POST {
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
    };

    axum::Server::bind(&"0.0.0.0:8080".parse().unwrap())
        .serve(app.into_make_service())
        .await
        .expect("Server failed");
}
