use super::super::helpers::build_file_info;
use super::super::{FileInfo, ScanError};
use log::debug;
use std::fs;
use std::path::Path;

pub(crate) fn collect_entries(root: &Path, depth: usize) -> Result<Vec<FileInfo>, ScanError> {
    debug!("{:?} at depth {}", root, depth);

    // TODO: impl

    let metadata = fs::metadata(root).map_err(|err| ScanError::Io(err.to_string()))?;

    Ok(vec![build_file_info(root, &metadata)])
}
