/// cd tars
/// sh download.sh
/// sh server.sh
/// http://127.0.0.1:8000
pub fn get_download_url() -> Vec<&'static str> {
    vec![
        "http://127.0.0.1:8000/antd-4.21.6.tgz",
        "http://127.0.0.1:8000/egg-2.36.0.tgz",
        "http://127.0.0.1:8000/umi-4.0.7.tgz",
        "http://127.0.0.1:8000/classnames-2.3.1.tgz",
    ]
}
