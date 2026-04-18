use thiserror::Error;

#[derive(Debug, Error)]
pub enum Error {
    #[error("websocket: {0}")]
    WebSocket(String),

    #[error("decode: {0}")]
    Decode(String),

    #[error("protocol: {0}")]
    Protocol(String),

    #[error("discovery: {0}")]
    Discovery(String),

    #[error("config: {0}")]
    Config(String),

    #[error("io: {0}")]
    Io(#[from] std::io::Error),

    #[error("http: {0}")]
    Http(#[from] reqwest::Error),

    #[error("json: {0}")]
    Json(#[from] serde_json::Error),

    #[error("{0}")]
    Other(String),
}

pub type Result<T> = std::result::Result<T, Error>;

impl From<anyhow::Error> for Error {
    fn from(e: anyhow::Error) -> Self {
        Error::Other(e.to_string())
    }
}
