use crate::scan::FileInfo;
use log::debug;
use std::path::{Path, PathBuf};

pub fn collect_windows_tags(root: &Path, entries: &mut [FileInfo]) {
    // TODO: Use WinRT APIs (StorageFile/StorageFolder) to fetch System.Keywords for immediate children.
    // TODO: Merge retrieved Windows tags with existing entry.windows_tags while preserving unique values.
    // TODO: Add robust error handling and logging for WinRT calls.

    let root_equivalence = PathEquivalence::new(root);

    for entry in entries.iter_mut() {
        if !is_direct_child(&entry.path, &root_equivalence) {
            continue;
        }

        if !entry.windows_tags.is_empty() {
            debug!(
                "Clearing placeholder Windows tags for {:?} (stub implementation)",
                entry.path
            );
            entry.windows_tags.clear();
        }
    }
}

struct PathEquivalence {
    canonical: PathBuf,
    insensitive_repr: Option<String>,
}

impl PathEquivalence {
    fn new(path: &Path) -> Self {
        let canonical = path.to_path_buf();
        let insensitive_repr = path.to_str().map(|value| value.to_ascii_lowercase());
        Self {
            canonical,
            insensitive_repr,
        }
    }

    fn equals(&self, other: &Path) -> bool {
        if other == self.canonical {
            return true;
        }
        match (&self.insensitive_repr, other.to_str()) {
            (Some(base), Some(candidate)) => base == &candidate.to_ascii_lowercase(),
            _ => false,
        }
    }
}

fn is_direct_child(path: &Path, root: &PathEquivalence) -> bool {
    match path.parent() {
        Some(parent) => root.equals(parent),
        None => false,
    }
}
