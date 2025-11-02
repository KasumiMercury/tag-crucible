use super::super::helpers::{collect_path_hierarchy, system_time_to_rfc3339};
use super::super::{FileInfo, ScanError};
use log::warn;
use std::fs;
use std::io::ErrorKind;
use std::path::Path;
use walkdir::{DirEntry, WalkDir};

pub(crate) fn collect_entries(root: &Path, depth: usize) -> Result<Vec<FileInfo>, ScanError> {
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
    Ok(build_file_info(entry.path(), &metadata))
}

fn build_file_info(path: &Path, metadata: &fs::Metadata) -> FileInfo {
    let hierarchy = collect_path_hierarchy(path);
    let modified = metadata.modified().ok().map(system_time_to_rfc3339);
    FileInfo {
        path: path.to_path_buf(),
        is_directory: metadata.is_dir(),
        is_symlink: metadata.file_type().is_symlink(),
        size: metadata.len(),
        hierarchy,
        modified,
        own_tags: Vec::new(),
        inherited_tags: Vec::new(),
        windows_tags: Vec::new(),
    }
}
