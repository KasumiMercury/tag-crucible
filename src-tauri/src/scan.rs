use chrono::{DateTime, Utc};
use log::{error, warn};
use serde::Serialize;
use std::cmp::Ordering;
use std::collections::HashMap;
use std::env;
use std::io::ErrorKind;
use std::path::{Component, Path, PathBuf};
use std::time::SystemTime;
use thiserror::Error;
use walkdir::{DirEntry, WalkDir};

// Custom error type for directory scanning operations
#[derive(Error, Debug, Serialize)]
#[serde(tag = "type", content = "message")]
pub enum ScanError {
    #[error("Failed to get current directory: {0}")]
    CurrentDir(String),

    #[error("Root path not found in scan results: {0:?}")]
    MissingRoot(PathBuf),

    #[error("IO error: {0}")]
    Io(String),
}

// File/Directory information structure
#[derive(Serialize, Clone)]
pub struct FileInfo {
    path: PathBuf,
    is_directory: bool,
    is_symlink: bool,
    size: u64,
    hierarchy: Vec<String>,
    modified: Option<String>,
}

// Tree node structure
#[derive(Serialize)]
pub struct DirectoryNode {
    name: String,
    info: FileInfo,
    #[serde(default)]
    children: Vec<DirectoryNode>,
}

// Generic directory scanning
#[tauri::command]
pub async fn scan_directory(path: PathBuf, depth: usize) -> Result<DirectoryNode, ScanError> {
    perform_scan(&path, depth).map_err(|e| {
        error!("Failed to scan directory at {:?}: {}", path, e);
        e
    })
}

// Scan current working directory
#[tauri::command]
pub async fn scan_current_directory() -> Result<DirectoryNode, ScanError> {
    let current_dir = env::current_dir().map_err(|e| {
        let err_msg = e.to_string();
        error!("Failed to get current directory: {}", err_msg);
        ScanError::CurrentDir(err_msg)
    })?;
    perform_scan(&current_dir, 2).map_err(|e| {
        error!(
            "Failed to scan current directory at {:?}: {}",
            current_dir, e
        );
        e
    })
}

fn perform_scan(path: &Path, depth: usize) -> Result<DirectoryNode, ScanError> {
    let entries = collect_entries(path, depth)?;
    build_directory_tree(path, &entries)
}

fn collect_entries(root: &Path, depth: usize) -> Result<Vec<FileInfo>, ScanError> {
    let mut entries = Vec::new();

    for entry in WalkDir::new(root).max_depth(depth) {
        let entry = match entry {
            Ok(e) => e,
            Err(e) => {
                if let Some(io_err) = e.io_error() {
                    if io_err.kind() == ErrorKind::PermissionDenied {
                        warn!("Skipping entry due to permission denied: {:?}", e.path());
                        continue;
                    }
                }
                return Err(ScanError::Io(e.to_string()));
            }
        };

        match entry.metadata() {
            Ok(_) => match to_file_info(&entry) {
                Ok(info) => entries.push(info),
                Err(e) => return Err(e),
            },
            Err(e) => if let Some(io_err) = e.io_error() {
                match io_err.kind() {
                    ErrorKind::PermissionDenied => {
                        warn!("Skipping entry due to permission denied: {:?}", entry.path());
                        continue;
                    }
                    _ => {
                        return Err(ScanError::Io(e.to_string()));
                    }
                }
            },
        }
    }

    Ok(entries)
}

fn to_file_info(entry: &DirEntry) -> Result<FileInfo, ScanError> {
    let metadata = entry.metadata().map_err(|e| ScanError::Io(e.to_string()))?;
    let hierarchy = collect_path_hierarchy(entry.path());

    let modified = metadata.modified().ok().map(system_time_to_rfc3339);

    Ok(FileInfo {
        path: entry.path().to_path_buf(),
        is_directory: metadata.is_dir(),
        is_symlink: metadata.file_type().is_symlink(),
        size: metadata.len(),
        hierarchy,
        modified,
    })
}

fn collect_path_hierarchy(path: &Path) -> Vec<String> {
    let mut segments = Vec::new();
    let mut pending_prefix: Option<String> = None;

    for component in path.components() {
        match component {
            Component::Prefix(prefix_component) => {
                pending_prefix = Some(prefix_component.as_os_str().to_string_lossy().to_string());
            }
            Component::RootDir => {
                if let Some(prefix) = pending_prefix.take() {
                    segments.push(format!("{prefix}{}", std::path::MAIN_SEPARATOR));
                } else {
                    segments.push(String::from(std::path::MAIN_SEPARATOR_STR));
                }
            }
            Component::Normal(os_str) => {
                if let Some(prefix) = pending_prefix.take() {
                    segments.push(prefix);
                }
                segments.push(os_str.to_string_lossy().to_string());
            }
            Component::CurDir => {}
            Component::ParentDir => segments.push(String::from("..")),
        }
    }

    if let Some(prefix) = pending_prefix.take() {
        segments.push(prefix);
    }

    segments
}

fn system_time_to_rfc3339(time: SystemTime) -> String {
    DateTime::<Utc>::from(time).to_rfc3339()
}

fn build_directory_tree(root: &Path, entries: &[FileInfo]) -> Result<DirectoryNode, ScanError> {
    let mut adjacency: HashMap<PathBuf, Vec<usize>> = HashMap::new();

    for (idx, entry) in entries.iter().enumerate() {
        if let Some(parent) = entry.path.parent() {
            adjacency.entry(parent.to_path_buf()).or_default().push(idx);
        }
    }

    for children in adjacency.values_mut() {
        children.sort_unstable();
    }

    let root_index = entries
        .iter()
        .position(|entry| entry.path == root)
        .ok_or_else(|| ScanError::MissingRoot(root.to_path_buf()))?;

    Ok(build_node(entries, &adjacency, root_index))
}

fn build_node(
    entries: &[FileInfo],
    adjacency: &HashMap<PathBuf, Vec<usize>>,
    index: usize,
) -> DirectoryNode {
    let info = entries[index].clone();
    let name = info
        .path
        .file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_else(|| info.path.to_string_lossy().to_string());

    let mut children = adjacency
        .get(&info.path)
        .into_iter()
        .flat_map(|indices| indices.iter().copied())
        .filter(|&child_idx| child_idx != index)
        .map(|child_idx| build_node(entries, adjacency, child_idx))
        .collect::<Vec<_>>();

    children.sort_by(compare_nodes);

    DirectoryNode {
        name,
        info,
        children,
    }
}

fn compare_nodes(a: &DirectoryNode, b: &DirectoryNode) -> Ordering {
    match (a.info.is_directory, b.info.is_directory) {
        (true, false) => Ordering::Less,
        (false, true) => Ordering::Greater,
        _ => a.name.cmp(&b.name),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    fn file_info(path: &str, is_directory: bool) -> FileInfo {
        FileInfo {
            path: PathBuf::from(path),
            is_directory,
            is_symlink: false,
            size: 0,
            hierarchy: collect_path_hierarchy(Path::new(path)),
            modified: None,
        }
    }

    #[test]
    fn build_tree_simple() {
        let root = PathBuf::from("/root");
        let entries = vec![
            file_info("/root", true),
            file_info("/root/file1.txt", false),
            file_info("/root/file2.txt", false),
        ];

        let tree = build_directory_tree(root.as_path(), &entries).unwrap();
        assert_eq!(tree.info.path, PathBuf::from("/root"));
        assert_eq!(tree.children.len(), 2);
        assert_eq!(tree.children[0].info.path, PathBuf::from("/root/file1.txt"));
        assert_eq!(tree.children[1].info.path, PathBuf::from("/root/file2.txt"));
    }

    #[test]
    fn build_tree_root_only() {
        let root = PathBuf::from("/root");
        let entries = vec![file_info("/root", true)];

        let tree = build_directory_tree(root.as_path(), &entries).unwrap();
        assert_eq!(tree.info.path, PathBuf::from("/root"));
        assert!(tree.children.is_empty());
    }

    #[test]
    fn build_tree_nested() {
        let root = PathBuf::from("/root");
        let entries = vec![
            file_info("/root", true),
            file_info("/root/dir1", true),
            file_info("/root/dir1/file.txt", false),
            file_info("/root/dir2", true),
            file_info("/root/dir2/file_a.txt", false),
        ];

        let tree = build_directory_tree(root.as_path(), &entries).unwrap();
        assert_eq!(tree.children.len(), 2);

        let dir1 = tree
            .children
            .iter()
            .find(|child| child.info.path == PathBuf::from("/root/dir1"))
            .unwrap();
        assert_eq!(dir1.children.len(), 1);
        assert_eq!(
            dir1.children[0].info.path,
            PathBuf::from("/root/dir1/file.txt")
        );

        let dir2 = tree
            .children
            .iter()
            .find(|child| child.info.path == PathBuf::from("/root/dir2"))
            .unwrap();
        assert_eq!(dir2.children.len(), 1);
        assert_eq!(
            dir2.children[0].info.path,
            PathBuf::from("/root/dir2/file_a.txt")
        );
    }

    #[test]
    fn build_tree_missing_root() {
        let root = PathBuf::from("/root");
        let entries = vec![file_info("/other", true)];

        let result = build_directory_tree(root.as_path(), &entries);
        assert!(matches!(result, Err(ScanError::MissingRoot(_))));
    }
}
