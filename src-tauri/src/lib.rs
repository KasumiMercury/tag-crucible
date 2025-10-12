mod scan;
mod tagging;

use log::info;
use scan::{scan_current_directory, scan_directory};
use std::fs;
use std::sync::Mutex;
use tauri::Manager;

use tagging::assign_tag_to_paths;

pub(crate) struct DbConnection {
    db: Mutex<Option<duckdb::Connection>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(DbConnection {
            db: Default::default(),
        })
        .setup(|app| {
            let handle = app.handle();

            let app_data_dir = handle
                .path()
                .app_data_dir()
                .map_err(|e| format!("Failed to get app data directory: {}", e))?;

            let db_dir = app_data_dir.join("tag-crucible");
            fs::create_dir_all(&db_dir).map_err(|e| {
                format!("Failed to create database directory at {:?}: {}", db_dir, e)
            })?;

            let db_path = db_dir.join("data.duckdb");
            let conn = duckdb::Connection::open(&db_path)
                .map_err(|e| format!("Failed to open DuckDB connection at {:?}: {}", db_path, e))?;

            tagging::ensure_schema(&conn)
                .map_err(|e| format!("Failed to initialize DuckDB schema: {}", e))?;

            let db_state = handle.state::<DbConnection>();
            *db_state
                .db
                .lock()
                .map_err(|e| format!("Failed to acquire DbConnection lock: {}", e))? = Some(conn);

            info!("DuckDB initialized successfully at: {:?}", db_path);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            scan_directory,
            scan_current_directory,
            assign_tag_to_paths
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
