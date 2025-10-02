use std::env;
use walkdir::WalkDir;
use serde::Serialize;
use thiserror::Error;
use std::path::PathBuf;

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

// Generic directory scanning function
#[tauri::command]
async fn scan_directory(path: String) -> Result<Vec<String>, ScanError> {
    let mut entries = Vec::new();

    let mut walker = WalkDir::new(&path).into_iter();
    loop {
        let entry = match walker.next() {
            Some(Ok(entry)) => entry,
            Some(Err(e)) => return Err(ScanError::Io(e.to_string())),
            None => break,
        };
        entries.push(entry.path().display().to_string());
    }

    Ok(entries)
}

// Scan current working directory and return relative paths
#[tauri::command]
async fn scan_current_directory() -> Result<Vec<String>, ScanError> {
    let current_dir = env::current_dir()
        .map_err(|e| ScanError::CurrentDir(e.to_string()))?;

    let entries = scan_directory(current_dir.display().to_string()).await?;

    let relative_entries = entries
        .into_iter()
        .filter_map(|path| {
            let path_buf = PathBuf::from(&path);
            path_buf
                .strip_prefix(&current_dir)
                .ok()
                .map(|p| p.display().to_string())
        })
        .collect();

    Ok(relative_entries)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![scan_directory, scan_current_directory])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
