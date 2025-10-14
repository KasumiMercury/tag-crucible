use chrono::{DateTime, Utc};
use log::{error, warn};
use serde::Serialize;
use std::cmp::Ordering;
use std::collections::{BTreeMap, BTreeSet, HashMap};
use std::env;
use std::fs;
use std::io::ErrorKind;
use std::path::{Component, Path, PathBuf};
use std::time::SystemTime;
use tauri::State;
use thiserror::Error;
use walkdir::{DirEntry, WalkDir};

use crate::tagging::{get_tags_for_directory, DirectoryTagSnapshot};
use crate::DbConnection;

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

    #[error("Database error: {0}")]
    Database(String),
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
    own_tags: Vec<String>,
    inherited_tags: Vec<String>,
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
pub async fn scan_directory(
    state: State<'_, DbConnection>,
    path: PathBuf,
    depth: usize,
) -> Result<DirectoryNode, ScanError> {
    let tags = fetch_tags_for_scan(&state, &path, depth)?;
    perform_scan(&path, depth, &tags).map_err(|e| {
        error!("Failed to scan directory at {:?}: {}", path, e);
        e
    })
}

// Scan current working directory
#[tauri::command]
pub async fn scan_current_directory(
    state: State<'_, DbConnection>,
) -> Result<DirectoryNode, ScanError> {
    let current_dir = env::current_dir().map_err(|e| {
        let err_msg = e.to_string();
        error!("Failed to get current directory: {}", err_msg);
        ScanError::CurrentDir(err_msg)
    })?;
    let tags = fetch_tags_for_scan(&state, &current_dir, 2)?;

    perform_scan(&current_dir, 2, &tags).map_err(|e| {
        error!(
            "Failed to scan current directory at {:?}: {}",
            current_dir, e
        );
        e
    })
}

fn perform_scan(
    path: &Path,
    depth: usize,
    tags: &DirectoryTagSnapshot,
) -> Result<DirectoryNode, ScanError> {
    let mut entries = collect_entries(path, depth)?;
    apply_tags(path, &mut entries, tags);
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
            Err(e) => {
                if let Some(io_err) = e.io_error() {
                    match io_err.kind() {
                        ErrorKind::PermissionDenied => {
                            warn!(
                                "Skipping entry due to permission denied: {:?}",
                                entry.path()
                            );
                            continue;
                        }
                        _ => {
                            return Err(ScanError::Io(e.to_string()));
                        }
                    }
                }
            }
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
        own_tags: Vec::new(),
        inherited_tags: Vec::new(),
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

fn fetch_tags_for_scan(
    state: &State<DbConnection>,
    root: &Path,
    depth: usize,
) -> Result<DirectoryTagSnapshot, ScanError> {
    let guard = state
        .db
        .lock()
        .map_err(|err| ScanError::Database(err.to_string()))?;
    let connection = guard
        .as_ref()
        .ok_or_else(|| ScanError::Database("Database connection is not available".into()))?;

    get_tags_for_directory(connection, root, depth)
        .map_err(|err| ScanError::Database(err.to_string()))
}

fn apply_tags(
    root: &Path,
    entries: &mut [FileInfo],
    tag_snapshot: &DirectoryTagSnapshot,
) {
    let mut cache: HashMap<PathBuf, (Vec<String>, Vec<String>)> = HashMap::new();
    let normalized_root = normalize_path_buf(root);
    let direct_tags = &tag_snapshot.direct_tags;
    let root_ancestor_tags = &tag_snapshot.root_ancestor_tags;

    for entry in entries.iter_mut() {
        let normalized_path = normalize_path_buf(&entry.path);
        let (own_tags, inherited_tags) = compute_own_and_inherited_tags(
            &normalized_path,
            &normalized_root,
            direct_tags,
            root_ancestor_tags,
            &mut cache,
        );
        entry.own_tags = own_tags;
        entry.inherited_tags = inherited_tags;
    }
}

fn compute_own_and_inherited_tags(
    path: &Path,
    root: &Path,
    direct_tags: &BTreeMap<PathBuf, Vec<String>>,
    root_ancestor_tags: &[String],
    cache: &mut HashMap<PathBuf, (Vec<String>, Vec<String>)>,
) -> (Vec<String>, Vec<String>) {
    if let Some(existing) = cache.get(path) {
        return existing.clone();
    }

    let own_tags: Vec<String> = direct_tags
        .get(path)
        .map(|tags| tags.clone())
        .unwrap_or_default();

    let inherited_tags = if path == root {
        let mut inherited = BTreeSet::new();
        inherited.extend(root_ancestor_tags.iter().cloned());
        inherited.into_iter().collect::<Vec<_>>()
    } else if let Some(parent) = path.parent() {
        let (parent_own, parent_inherited) =
            compute_own_and_inherited_tags(parent, root, direct_tags, root_ancestor_tags, cache);
        let mut inherited = BTreeSet::new();
        inherited.extend(parent_inherited);
        inherited.extend(parent_own);
        inherited.into_iter().collect::<Vec<_>>()
    } else {
        Vec::new()
    };

    let result = (own_tags, inherited_tags);
    cache.insert(path.to_path_buf(), result.clone());
    result
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

fn normalize_path_buf(path: &Path) -> PathBuf {
    match fs::canonicalize(path) {
        Ok(canonical) => canonical,
        Err(err) => {
            warn!(
                "Failed to canonicalize path during scan; using original value: {:?} ({})",
                path, err
            );
            path.to_path_buf()
        }
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
            own_tags: Vec::new(),
            inherited_tags: Vec::new(),
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

    #[test]
    fn apply_tags_propagates_and_sorts() {
        let root = PathBuf::from("/root");
        let mut entries = vec![
            file_info("/root", true),
            file_info("/root/folder", true),
            file_info("/root/folder/file.txt", false),
        ];

        let mut tags_map = BTreeMap::new();
        tags_map.insert(PathBuf::from("/root"), vec!["root-tag".to_string()]);
        tags_map.insert(
            PathBuf::from("/root/folder"),
            vec!["folder-tag".to_string(), "alpha".to_string()],
        );
        tags_map.insert(
            PathBuf::from("/root/folder/file.txt"),
            vec!["file-tag".to_string()],
        );

        let snapshot = DirectoryTagSnapshot {
            direct_tags: tags_map,
            root_ancestor_tags: Vec::new(),
        };

        apply_tags(root.as_path(), &mut entries, &snapshot);

        // Root: own_tags only
        assert_eq!(entries[0].own_tags, vec!["root-tag".to_string()]);
        assert_eq!(entries[0].inherited_tags, Vec::<String>::new());

        // Folder: own_tags + inherited from root
        assert_eq!(
            entries[1].own_tags,
            vec!["folder-tag".to_string(), "alpha".to_string()]
        );
        assert_eq!(entries[1].inherited_tags, vec!["root-tag".to_string()]);

        // File: own_tags + inherited from folder and root
        assert_eq!(entries[2].own_tags, vec!["file-tag".to_string()]);
        assert_eq!(
            entries[2].inherited_tags,
            vec![
                "alpha".to_string(),
                "folder-tag".to_string(),
                "root-tag".to_string()
            ]
        );
    }

    #[test]
    fn apply_tags_assigns_root_ancestor_tags() {
        let root = PathBuf::from("/root/project");
        let mut entries = vec![
            file_info("/root/project", true),
            file_info("/root/project/nested", true),
        ];

        let snapshot = DirectoryTagSnapshot {
            direct_tags: BTreeMap::new(),
            root_ancestor_tags: vec!["alpha".to_string(), "beta".to_string()],
        };

        apply_tags(root.as_path(), &mut entries, &snapshot);

        assert!(entries[0].own_tags.is_empty());
        assert_eq!(
            entries[0].inherited_tags,
            vec!["alpha".to_string(), "beta".to_string()]
        );

        assert!(entries[1].own_tags.is_empty());
        assert_eq!(
            entries[1].inherited_tags,
            vec!["alpha".to_string(), "beta".to_string()]
        );
    }

    #[test]
    fn apply_tags_handles_empty_direct_map() {
        let root = PathBuf::from("/root");
        let mut entries = vec![file_info("/root", true)];
        let snapshot = DirectoryTagSnapshot {
            direct_tags: BTreeMap::new(),
            root_ancestor_tags: Vec::new(),
        };

        apply_tags(root.as_path(), &mut entries, &snapshot);
        assert!(entries[0].own_tags.is_empty());
        assert!(entries[0].inherited_tags.is_empty());
    }
}
