use serde::Serialize;
use std::collections::HashMap;
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
#[derive(Serialize, Clone)]
pub struct FileInfo {
    path: PathBuf,
    is_directory: bool,
    is_symlink: bool,
    size: u64,
    modified: Option<String>,
}

// Tree node structure
#[derive(Serialize)]
pub struct Node {
    name: String,
    info: FileInfo,
    children: Option<Vec<Node>>,
}

fn build_tree(root: PathBuf, entries: Vec<FileInfo>) -> Option<Node> {
    let parent_map = entries
        .iter()
        .filter_map(|e| {
            let path_buf = &e.path;

            if *path_buf == root {
                return None;
            }

            // Get parent directory
            path_buf.parent().map(|parent| (parent, e.clone()))
        })
        .fold(HashMap::new(), |mut map, (parent, file_info)| {
            map.entry(parent.to_path_buf())
                .or_insert_with(Vec::new)
                .push(file_info);
            map
        });

    let root_info = entries.iter().find(|e| e.path == root)?.clone();

    Some(build_node_recursive(&parent_map, root_info))
}

fn build_node_recursive(map: &HashMap<PathBuf, Vec<FileInfo>>, parent: FileInfo) -> Node {
    let name = match parent.path.file_name() {
        Some(name) => name.to_string_lossy().to_string(),
        None => parent.path.to_string_lossy().to_string(),
    };
    let children_info = map.get(&parent.path);
    match children_info {
        None => Node {
            name,
            info: parent,
            children: None,
        },
        Some(children) => {
            let children_nodes = children
                .iter()
                .map(|c| build_node_recursive(map, c.clone()))
                .collect::<Vec<_>>();
            Node {
                name,
                info: parent,
                children: Some(children_nodes),
            }
        }
    }
}

// Generic directory scanning function
#[tauri::command]
async fn scan_directory(path: PathBuf, depth: usize) -> Result<Node, ScanError> {
    let mut entries = Vec::new();

    let mut walker = WalkDir::new(&path).max_depth(depth).into_iter();
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
            path: entry.path().to_path_buf(),
            is_directory,
            is_symlink,
            size,
            modified,
        });
    }

    let tree = build_tree(path.clone(), entries.clone());
    match tree {
        Some(t) => Ok(t),
        None => Err(ScanError::StripPrefix(format!(
            "Root path {:?} not found in entries",
            path
        ))),
    }
}

// Scan current working directory and return relative paths
#[tauri::command]
async fn scan_current_directory() -> Result<Node, ScanError> {
    let current_dir = env::current_dir().map_err(|e| ScanError::CurrentDir(e.to_string()))?;

    let tree = scan_directory(current_dir, 2).await?;

    Ok(tree)
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

#[cfg(test)]
mod tests {
    use super::*;

    fn create_file_info(path: &str, is_directory: bool) -> FileInfo {
        FileInfo {
            path: PathBuf::from(path),
            is_directory,
            is_symlink: false,
            size: 0,
            modified: None,
        }
    }

    #[test]
    fn test_build_tree_simple() {
        let root = PathBuf::from("/root");
        let entries = vec![
            create_file_info("/root", true),
            create_file_info("/root/file1.txt", false),
            create_file_info("/root/file2.txt", false),
        ];

        let tree = build_tree(root, entries);
        assert!(tree.is_some());

        let node = tree.unwrap();
        assert_eq!(node.info.path, PathBuf::from("/root"));
        assert!(node.info.is_directory);
        assert!(node.children.is_some());

        let children = node.children.unwrap();
        assert_eq!(children.len(), 2);
        assert_eq!(children[0].info.path, PathBuf::from("/root/file1.txt"));
        assert_eq!(children[1].info.path, PathBuf::from("/root/file2.txt"));
    }

    #[test]
    fn test_build_tree_root_only() {
        let root = PathBuf::from("/root");
        let entries = vec![create_file_info("/root", true)];

        let tree = build_tree(root, entries);
        assert!(tree.is_some());

        let node = tree.unwrap();
        assert_eq!(node.info.path, PathBuf::from("/root"));
        assert!(node.children.is_none());
    }

    #[test]
    fn test_build_tree_not_found() {
        let root = PathBuf::from("/root");
        let entries = vec![
            create_file_info("/other", true),
            create_file_info("/other/file.txt", false),
        ];

        let tree = build_tree(root, entries);
        assert!(tree.is_none());
    }

    #[test]
    fn test_build_tree_multilevel() {
        let root = PathBuf::from("/root");
        let entries = vec![
            create_file_info("/root", true),
            create_file_info("/root/dir1", true),
            create_file_info("/root/dir1/file1.txt", false),
            create_file_info("/root/dir1/file2.txt", false),
            create_file_info("/root/file.txt", false),
        ];

        let tree = build_tree(root, entries);
        assert!(tree.is_some());

        let node = tree.unwrap();
        assert_eq!(node.info.path, PathBuf::from("/root"));
        assert!(node.children.is_some());

        let children = node.children.unwrap();
        assert_eq!(children.len(), 2);

        let dir1 = children
            .iter()
            .find(|c| c.info.path == PathBuf::from("/root/dir1"));
        assert!(dir1.is_some());

        let dir1_node = dir1.unwrap();
        assert!(dir1_node.children.is_some());

        let dir1_children = dir1_node.children.as_ref().unwrap();
        assert_eq!(dir1_children.len(), 2);
        assert_eq!(
            dir1_children[0].info.path,
            PathBuf::from("/root/dir1/file1.txt")
        );
        assert_eq!(
            dir1_children[1].info.path,
            PathBuf::from("/root/dir1/file2.txt")
        );
    }

    #[test]
    fn test_build_node_no_children() {
        let map = HashMap::new();
        let file_info = create_file_info("/root/file.txt", false);

        let node = build_node_recursive(&map, file_info);

        assert_eq!(node.info.path, PathBuf::from("/root/file.txt"));
        assert!(!node.info.is_directory);
        assert!(node.children.is_none());
    }

    #[test]
    fn test_build_node_with_children() {
        let mut map = HashMap::new();
        map.insert(
            PathBuf::from("/root"),
            vec![
                create_file_info("/root/file1.txt", false),
                create_file_info("/root/file2.txt", false),
            ],
        );

        let parent_info = create_file_info("/root", true);
        let node = build_node_recursive(&map, parent_info);

        assert_eq!(node.info.path, PathBuf::from("/root"));
        assert!(node.info.is_directory);
        assert!(node.children.is_some());

        let children = node.children.unwrap();
        assert_eq!(children.len(), 2);
        assert_eq!(children[0].info.path, PathBuf::from("/root/file1.txt"));
        assert_eq!(children[1].info.path, PathBuf::from("/root/file2.txt"));
        assert!(children[0].children.is_none());
        assert!(children[1].children.is_none());
    }

    #[test]
    fn test_build_node_multilevel() {
        let mut map = HashMap::new();
        map.insert(
            PathBuf::from("/root"),
            vec![
                create_file_info("/root/dir1", true),
                create_file_info("/root/file.txt", false),
            ],
        );
        map.insert(
            PathBuf::from("/root/dir1"),
            vec![
                create_file_info("/root/dir1/nested.txt", false),
                create_file_info("/root/dir1/dir2", true),
            ],
        );
        map.insert(
            PathBuf::from("/root/dir1/dir2"),
            vec![create_file_info("/root/dir1/dir2/deep.txt", false)],
        );

        let parent_info = create_file_info("/root", true);
        let node = build_node_recursive(&map, parent_info);

        assert_eq!(node.info.path, PathBuf::from("/root"));
        assert!(node.children.is_some());

        let children = node.children.as_ref().unwrap();
        assert_eq!(children.len(), 2);

        // Check dir1
        let dir1 = children
            .iter()
            .find(|c| c.info.path == PathBuf::from("/root/dir1"));
        assert!(dir1.is_some());

        let dir1_node = dir1.unwrap();
        let dir1_children = dir1_node.children.as_ref().unwrap();
        assert_eq!(dir1_children.len(), 2);

        // Check dir2
        let dir2 = dir1_children
            .iter()
            .find(|c| c.info.path == PathBuf::from("/root/dir1/dir2"));
        assert!(dir2.is_some());

        let dir2_node = dir2.unwrap();
        let dir2_children = dir2_node.children.as_ref().unwrap();
        assert_eq!(dir2_children.len(), 1);
        assert_eq!(
            dir2_children[0].info.path,
            PathBuf::from("/root/dir1/dir2/deep.txt")
        );
    }
}
