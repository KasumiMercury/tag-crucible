use super::super::helpers::{collect_path_hierarchy, system_time_to_rfc3339};
use super::super::{FileInfo, ScanError};
use log::{debug, warn};
use std::collections::{HashSet, VecDeque};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};
use windows::{
    core::{Array, IInspectable, Interface, Result as WinResult, HSTRING},
    Foundation::{DateTime, IPropertyValue, PropertyType},
    Storage::{
        FileProperties::{BasicProperties, PropertyPrefetchOptions},
        Search::{CommonFileQuery, CommonFolderQuery, FolderDepth, IndexerOption, QueryOptions},
        StorageFolder, SystemProperties,
    },
};
use windows_collections::{IIterable, IVectorView};

const WINDOWS_TO_UNIX_EPOCH_DIFF_SECS: i64 = 11_644_473_600;
const HUNDRED_NANOS_PER_SEC: i64 = 10_000_000;

type NormalizedPath = String;

fn to_keywords(value: &IInspectable) -> WinResult<Vec<String>> {
    if let Ok(pv) = value.cast::<IPropertyValue>() {
        match pv.Type()? {
            PropertyType::StringArray => {
                let mut arr: Array<HSTRING> = Array::new();
                pv.GetStringArray(&mut arr)?;
                let v = arr.iter().map(|s| s.to_string()).collect();
                return Ok(v);
            }
            PropertyType::String => {
                let s: HSTRING = pv.GetString()?;
                return Ok(vec![s.to_string()]);
            }
            PropertyType::Empty => {
                // No keywords set
                return Ok(Vec::new());
            }
            _ => {
                // Try fallback for other types
            }
        }
    }

    if let Ok(view) = value.cast::<IVectorView<HSTRING>>() {
        let mut out = Vec::with_capacity(view.Size()? as usize);
        for i in 0..view.Size()? {
            out.push(view.GetAt(i)?.to_string());
        }
        return Ok(out);
    }

    Ok(Vec::new())
}

fn build_file_query_options() -> WinResult<QueryOptions> {
    let qo = QueryOptions::CreateCommonFileQuery(
        CommonFileQuery::DefaultQuery,
        &IIterable::<HSTRING>::from(vec![]),
    )?;
    qo.SetFolderDepth(FolderDepth::Shallow)?;
    qo.SetIndexerOption(IndexerOption::UseIndexerWhenAvailable)?;

    let keyword = SystemProperties::Keywords()?;
    let props = IIterable::<HSTRING>::from(vec![keyword]);
    qo.SetPropertyPrefetch(PropertyPrefetchOptions::BasicProperties, &props)?;

    Ok(qo)
}

fn build_folder_query_options() -> WinResult<QueryOptions> {
    let qo = QueryOptions::CreateCommonFolderQuery(CommonFolderQuery::DefaultQuery)?;
    qo.SetFolderDepth(FolderDepth::Shallow)?;
    qo.SetIndexerOption(IndexerOption::UseIndexerWhenAvailable)?;
    Ok(qo)
}

fn classify_entry(path: &Path, fallback_is_directory: bool) -> (bool, bool) {
    match fs::symlink_metadata(path) {
        Ok(metadata) => {
            if metadata.file_type().is_symlink() {
                let target_is_directory = fs::metadata(path)
                    .map(|meta| meta.is_dir())
                    .unwrap_or(fallback_is_directory);
                (target_is_directory, true)
            } else {
                (metadata.is_dir(), false)
            }
        }
        Err(_) => (fallback_is_directory, false),
    }
}

fn canonical_lowercase(path: &Path) -> Option<String> {
    fs::canonicalize(path)
        .ok()
        .map(|p| p.to_string_lossy().to_lowercase())
}

fn normalized_key(path: &Path) -> String {
    canonical_lowercase(path).unwrap_or_else(|| path.to_string_lossy().to_lowercase())
}

fn to_modified_timestamp(date_modified: DateTime) -> Option<String> {
    let date_modified_i64 = date_modified.UniversalTime;
    if date_modified_i64 <= 0 {
        return None;
    }

    let unix_timestamp_secs =
        (date_modified_i64 / HUNDRED_NANOS_PER_SEC) - WINDOWS_TO_UNIX_EPOCH_DIFF_SECS;
    let unix_timestamp_nanos = ((date_modified_i64 % HUNDRED_NANOS_PER_SEC) * 100) as u32;

    if unix_timestamp_secs >= 0 {
        Some(system_time_to_rfc3339(
            SystemTime::UNIX_EPOCH
                + Duration::new(unix_timestamp_secs as u64, unix_timestamp_nanos),
        ))
    } else {
        None
    }
}

fn collect_windows_tags(basic_props: &BasicProperties) -> WinResult<Vec<String>> {
    let keyword = SystemProperties::Keywords()?;
    let props = IIterable::<HSTRING>::from(vec![keyword.clone()]);

    if let Ok(map) = basic_props.RetrievePropertiesAsync(&props)?.join() {
        if let Ok(keywords_value) = map.Lookup(&keyword) {
            return Ok(to_keywords(&keywords_value).unwrap_or_default());
        }
    }

    Ok(Vec::new())
}

fn build_file_info_from_properties(
    path: PathBuf,
    basic_props: &BasicProperties,
    fallback_is_directory: bool,
) -> WinResult<FileInfo> {
    let size = basic_props.Size()?;
    let date_modified = basic_props.DateModified()?;
    let windows_tags = collect_windows_tags(basic_props)?;
    let hierarchy = collect_path_hierarchy(&path);
    let modified = to_modified_timestamp(date_modified);
    let (is_directory, is_symlink) = classify_entry(&path, fallback_is_directory);

    Ok(FileInfo {
        path,
        is_directory,
        is_symlink,
        size,
        hierarchy,
        modified,
        own_tags: Vec::new(),
        inherited_tags: Vec::new(),
        windows_tags,
    })
}

fn folder_to_file_info(folder: &StorageFolder) -> WinResult<FileInfo> {
    let basic_props = folder.GetBasicPropertiesAsync()?.join()?;
    let path = PathBuf::from(folder.Path()?.to_string());
    build_file_info_from_properties(path, &basic_props, true)
}

fn list_file(folder: &StorageFolder) -> WinResult<Vec<FileInfo>> {
    let query_options = build_file_query_options()?;
    let query = folder.CreateItemQueryWithOptions(&query_options)?;
    let items = query.GetItemsAsyncDefaultStartAndCount()?.join()?;

    let mut results = Vec::new();

    for item in &items {
        let basic_props = item.GetBasicPropertiesAsync()?.join()?;
        let path = PathBuf::from(item.Path()?.to_string());
        let fallback_is_directory = item.cast::<StorageFolder>().is_ok();
        results.push(build_file_info_from_properties(
            path,
            &basic_props,
            fallback_is_directory,
        )?);
    }

    Ok(results)
}

fn list_folder(folder: &StorageFolder) -> WinResult<Vec<StorageFolder>> {
    let query_options = build_folder_query_options()?;
    let query = folder.CreateFolderQueryWithOptions(&query_options)?;
    let folders = query.GetFoldersAsyncDefaultStartAndCount()?.join()?;

    let mut results = Vec::new();
    for folder in &folders {
        results.push(folder.clone());
    }

    Ok(results)
}

pub(crate) fn collect_entries(root: &Path, max_depth: usize) -> Result<Vec<FileInfo>, ScanError> {
    debug!("Scanning {:?} with depth {}", root, max_depth);

    let root_path_str = root.to_string_lossy().to_string();
    let root_hstring = HSTRING::from(&root_path_str);

    let root_folder = match StorageFolder::GetFolderFromPathAsync(&root_hstring) {
        Ok(async_op) => match async_op.join() {
            Ok(folder) => folder,
            Err(e) => {
                return Err(ScanError::Io(format!(
                    "Failed to access folder {:?}: {}",
                    root, e
                )));
            }
        },
        Err(e) => {
            return Err(ScanError::Io(format!(
                "Failed to create async operation for {:?}: {}",
                root, e
            )));
        }
    };

    let mut all_entries = Vec::new();
    let mut queue = VecDeque::new();
    let mut visited_dirs: HashSet<NormalizedPath> = HashSet::new();

    let root_info = folder_to_file_info(&root_folder)
        .map_err(|e| ScanError::Io(format!("Failed to retrieve metadata for {:?}: {}", root, e)))?;
    all_entries.push(root_info);

    visited_dirs.insert(normalized_key(root));
    queue.push_back((root_folder, root.to_path_buf(), 0));

    while let Some((folder, folder_path, current_depth)) = queue.pop_front() {
        let can_descend = current_depth < max_depth;

        if can_descend {
            match list_file(&folder) {
                Ok(files) => {
                    debug!(
                        "Found {} files in {:?} at depth {}",
                        files.len(),
                        folder_path,
                        current_depth
                    );
                    all_entries.extend(files);
                }
                Err(e) => {
                    warn!(
                        "Failed to list files in {:?}: {}. Skipping.",
                        folder_path, e
                    );
                }
            }
        } else {
            debug!(
                "Skipping file enumeration for {:?} at depth {} (max depth {})",
                folder_path, current_depth, max_depth
            );
        }

        if can_descend {
            match list_folder(&folder) {
                Ok(subfolders) => {
                    debug!(
                        "Found {} subfolders in {:?} at depth {}",
                        subfolders.len(),
                        folder_path,
                        current_depth
                    );

                    for subfolder in subfolders {
                        if let Ok(subfolder_path_hstring) = subfolder.Path() {
                            let subfolder_path = PathBuf::from(subfolder_path_hstring.to_string());
                            let key = normalized_key(&subfolder_path);
                            if !visited_dirs.insert(key) {
                                debug!(
                                    "Skipping already visited folder during scan: {:?}",
                                    subfolder_path
                                );
                                continue;
                            }
                            queue.push_back((subfolder, subfolder_path, current_depth + 1));
                        }
                    }
                }
                Err(e) => {
                    warn!(
                        "Failed to list subfolders in {:?}: {}. Skipping.",
                        folder_path, e
                    );
                }
            }
        }
    }

    debug!("Collected {} total entries", all_entries.len());
    Ok(all_entries)
}
