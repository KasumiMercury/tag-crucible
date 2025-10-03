use serde::Serialize;
use std::env;
use std::path::PathBuf;
use std::time::SystemTime;
use thiserror::Error;
use walkdir::WalkDir;

// Custom error type for directory scanning operations
#[derive(Error, Debug, Serialize)]
#[serde(tag = "type", content = "message")]
pub enum ScanError {
    #[error("Failed to get current directory: {0}")]
    CurrentDir(String),

    #[error("Failed to strip prefix: {0}")]
    StripPrefix(String),

    #[error("IO error: {0}")]
    Io(String),
}

// File/Directory information structure
#[derive(Serialize)]
pub struct FileInfo {
    path: String,
    is_directory: bool,
    is_symlink: bool,
    size: u64,
    modified: Option<String>,
}

// Generic directory scanning function
#[tauri::command]
async fn scan_directory(path: String) -> Result<Vec<FileInfo>, ScanError> {
    let mut entries = Vec::new();

    let mut walker = WalkDir::new(&path).max_depth(1).into_iter();
    loop {
        let entry = match walker.next() {
            Some(Ok(entry)) => entry,
            Some(Err(e)) => return Err(ScanError::Io(e.to_string())),
            None => break,
        };

        let metadata = entry.metadata().map_err(|e| ScanError::Io(e.to_string()))?;
        let is_directory = metadata.is_dir();
        let is_symlink = metadata.file_type().is_symlink();
        let size = metadata.len();
        let modified = metadata.modified().ok().and_then(|time| {
            time.duration_since(SystemTime::UNIX_EPOCH).ok().map(|d| {
                chrono::DateTime::from_timestamp(d.as_secs() as i64, 0)
                    .map(|dt| dt.to_rfc3339())
                    .unwrap_or_default()
            })
        });

        entries.push(FileInfo {
            path: entry.path().display().to_string(),
            is_directory,
            is_symlink,
            size,
            modified,
        });
    }

    Ok(entries)
}

// Scan current working directory and return relative paths
#[tauri::command]
async fn scan_current_directory() -> Result<Vec<FileInfo>, ScanError> {
    let current_dir = env::current_dir().map_err(|e| ScanError::CurrentDir(e.to_string()))?;

    let entries = scan_directory(current_dir.display().to_string()).await?;

    let relative_entries = entries
        .into_iter()
        .filter_map(|mut file_info| {
            let path_buf = PathBuf::from(&file_info.path);
            path_buf.strip_prefix(&current_dir).ok().map(|p| {
                file_info.path = p.display().to_string();
                file_info
            })
        })
        .collect();

    Ok(relative_entries)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            scan_directory,
            scan_current_directory
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
