use chrono::{DateTime, Utc};
use std::path::{Component, Path};
use std::time::SystemTime;

pub(crate) fn collect_path_hierarchy(path: &Path) -> Vec<String> {
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

pub(crate) fn system_time_to_rfc3339(time: SystemTime) -> String {
    DateTime::<Utc>::from(time).to_rfc3339()
}
