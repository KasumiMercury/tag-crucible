use crate::DbConnection;
use log::{debug, warn};
use serde::Serialize;
use std::collections::BTreeSet;
use std::fs;
use std::path::PathBuf;
use tauri::State;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "type", content = "message")]
pub enum TaggingError {
    #[error("Tag must not be empty")]
    EmptyTag,

    #[error("Paths must not be empty")]
    EmptyPaths,

    #[error("Failed to acquire database connection: {0}")]
    Connection(String),

    #[error("Database connection is not available")]
    ConnectionUnavailable,

    #[error("Database error: {0}")]
    Database(String),
}

#[tauri::command]
pub fn assign_tag_to_paths(
    state: State<'_, DbConnection>,
    paths: Vec<String>,
    tag: String,
) -> Result<(), TaggingError> {
    let normalized_tag = tag.trim();
    if normalized_tag.is_empty() {
        return Err(TaggingError::EmptyTag);
    }

    if paths.is_empty() {
        return Err(TaggingError::EmptyPaths);
    }

    let mut unique_paths = BTreeSet::new();
    for path in paths {
        let normalized = normalize_path(&path);
        debug!("Assigning tag to path: {} -> {}", path, normalized);
        unique_paths.insert(normalized);
    }

    if unique_paths.is_empty() {
        return Err(TaggingError::EmptyPaths);
    }

    let mut connection_guard = state
        .db
        .lock()
        .map_err(|err| TaggingError::Connection(err.to_string()))?;
    let connection = connection_guard
        .as_mut()
        .ok_or(TaggingError::ConnectionUnavailable)?;

    ensure_schema(connection)?;

    let transaction = connection
        .transaction()
        .map_err(|err| TaggingError::Database(err.to_string()))?;

    {
        let mut statement = transaction
            .prepare("INSERT OR REPLACE INTO path_tags (path, tag) VALUES (?1, ?2)")
            .map_err(|err| TaggingError::Database(err.to_string()))?;

        for path in unique_paths {
            statement
                .execute(duckdb::params![path, normalized_tag])
                .map_err(|err| TaggingError::Database(err.to_string()))?;
        }
    }

    transaction
        .commit()
        .map_err(|err| TaggingError::Database(err.to_string()))?;

    Ok(())
}

pub(crate) fn ensure_schema(connection: &duckdb::Connection) -> Result<(), TaggingError> {
    connection
        .execute(
            "
            CREATE TABLE IF NOT EXISTS path_tags (
                path TEXT NOT NULL,
                tag  TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (path, tag)
            )
            ",
            [],
        )
        .map_err(|err| TaggingError::Database(err.to_string()))?;

    Ok(())
}

fn normalize_path(path: &str) -> String {
    let path_buf = PathBuf::from(path);
    match fs::canonicalize(&path_buf) {
        Ok(canonical) => canonical.to_string_lossy().to_string(),
        Err(err) => {
            warn!(
                "Failed to canonicalize path; storing as provided: {} ({})",
                path, err
            );
            path.to_string()
        }
    }
}
