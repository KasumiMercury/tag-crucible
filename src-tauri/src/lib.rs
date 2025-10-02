use std::env;
use walkdir::WalkDir;

// Generic directory scanning function
#[tauri::command]
fn scan_directory(path: String) -> Result<Vec<String>, String> {
    let mut entries = Vec::new();

    for entry in WalkDir::new(&path).into_iter().filter_map(|e| e.ok()) {
        entries.push(entry.path().display().to_string());
    }

    Ok(entries)
}

// Scan current working directory and return relative paths
#[tauri::command]
fn scan_current_directory() -> Result<Vec<String>, String> {
    let current_dir = env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?;

    let mut entries = Vec::new();

    for entry in WalkDir::new(&current_dir).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();

        let relative_path = path
            .strip_prefix(&current_dir)
            .map_err(|e| format!("Failed to strip prefix: {}", e))?
            .display()
            .to_string();

        // Skip root directory entry
        if !relative_path.is_empty() {
            entries.push(relative_path);
        }
    }

    Ok(entries)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![scan_directory, scan_current_directory])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
