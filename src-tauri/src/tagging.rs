use crate::DbConnection;
use log::{debug, warn};
use serde::Serialize;
use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Component, Path, PathBuf};
use tauri::State;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "type", content = "message")]
pub enum TaggingError {
    #[error("Tag must not be empty")]
    EmptyTag,

    #[error("Paths must not be empty")]
    EmptyPaths,

    #[error("Failed to acquire database connection: {0}")]
    Connection(String),

    #[error("Database connection is not available")]
    ConnectionUnavailable,

    #[error("Database error: {0}")]
    Database(String),
}

#[tauri::command]
pub fn assign_tag_to_paths(
    state: State<'_, DbConnection>,
    paths: Vec<String>,
    tag: String,
) -> Result<(), TaggingError> {
    let normalized_tag = tag.trim();
    if normalized_tag.is_empty() {
        return Err(TaggingError::EmptyTag);
    }

    if paths.is_empty() {
        return Err(TaggingError::EmptyPaths);
    }

    let mut unique_paths: BTreeMap<String, i64> = BTreeMap::new();
    for path in paths {
        let normalized = normalize_path(&path);
        let depth = calculate_path_depth(Path::new(&normalized));
        debug!("Assigning tag to path: {} -> {}", path, normalized);
        unique_paths.insert(normalized, depth);
    }

    if unique_paths.is_empty() {
        return Err(TaggingError::EmptyPaths);
    }

    let mut connection_guard = state
        .db
        .lock()
        .map_err(|err| TaggingError::Connection(err.to_string()))?;
    let connection = connection_guard
        .as_mut()
        .ok_or(TaggingError::ConnectionUnavailable)?;

    ensure_schema(connection)?;

    let transaction = connection
        .transaction()
        .map_err(|err| TaggingError::Database(err.to_string()))?;

    {
        let mut statement = transaction
            .prepare("INSERT OR REPLACE INTO path_tags (path, tag, path_depth) VALUES (?1, ?2, ?3)")
            .map_err(|err| TaggingError::Database(err.to_string()))?;

        for (path, depth) in unique_paths {
            statement
                .execute(duckdb::params![path, normalized_tag, depth])
                .map_err(|err| TaggingError::Database(err.to_string()))?;
        }
    }

    transaction
        .commit()
        .map_err(|err| TaggingError::Database(err.to_string()))?;

    Ok(())
}

pub(crate) fn ensure_schema(connection: &duckdb::Connection) -> Result<(), TaggingError> {
    connection
        .execute(
            "
            CREATE TABLE IF NOT EXISTS path_tags (
                path TEXT NOT NULL,
                tag  TEXT NOT NULL,
                path_depth INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (path, tag)
            )
            ",
            [],
        )
        .map_err(|err| TaggingError::Database(err.to_string()))?;

    Ok(())
}

pub fn get_tags_for_directory<P: AsRef<Path>>(
    connection: &duckdb::Connection,
    root: P,
    max_depth: usize,
) -> Result<BTreeMap<PathBuf, Vec<String>>, TaggingError> {
    ensure_schema(connection)?;

    let root = root.as_ref();
    let normalized_root = normalize_path(&root.to_string_lossy());
    let root_path = PathBuf::from(&normalized_root);
    let root_depth = calculate_path_depth(&root_path);
    let depth_offset = if max_depth > i64::MAX as usize {
        i64::MAX
    } else {
        max_depth as i64
    };
    let max_allowed_depth = root_depth.saturating_add(depth_offset);
    let descendant_pattern = descendant_like_pattern(&normalized_root);

    let mut tags_by_path: BTreeMap<PathBuf, BTreeSet<String>> = BTreeMap::new();
    let mut descendant_statement = connection
        .prepare(
            "
            SELECT path, tag
            FROM path_tags
            WHERE path = ?1
               OR (path_depth > ?2 AND path_depth <= ?3 AND path LIKE ?4 ESCAPE '\\')
            ",
        )
        .map_err(|err| TaggingError::Database(err.to_string()))?;

    {
        let mut rows = descendant_statement
            .query(duckdb::params![
                normalized_root.clone(),
                root_depth,
                max_allowed_depth,
                descendant_pattern
            ])
            .map_err(|err| TaggingError::Database(err.to_string()))?;

        while let Some(row) = rows
            .next()
            .map_err(|err| TaggingError::Database(err.to_string()))?
        {
            let stored_path: String = row
                .get(0)
                .map_err(|err| TaggingError::Database(err.to_string()))?;
            let tag: String = row
                .get(1)
                .map_err(|err| TaggingError::Database(err.to_string()))?;

            let stored_path_buf = PathBuf::from(&stored_path);

            if stored_path_buf == root_path || stored_path_buf.starts_with(&root_path) {
                tags_by_path
                    .entry(stored_path_buf)
                    .or_default()
                    .insert(tag);
            }
        }
    }

    let ancestor_paths: Vec<String> = root_path
        .ancestors()
        .skip(1)
        .filter_map(|ancestor| {
            if ancestor.as_os_str().is_empty() {
                None
            } else {
                Some(ancestor.to_string_lossy().to_string())
            }
        })
        .collect();

    if !ancestor_paths.is_empty() {
        let placeholder_list = std::iter::repeat("?")
            .take(ancestor_paths.len())
            .collect::<Vec<_>>()
            .join(", ");
        let ancestor_sql = format!(
            "SELECT path, tag FROM path_tags WHERE path IN ({})",
            placeholder_list
        );

        let mut ancestor_statement = connection
            .prepare(&ancestor_sql)
            .map_err(|err| TaggingError::Database(err.to_string()))?;

        let mut rows = ancestor_statement
            .query(duckdb::params_from_iter(
                ancestor_paths.iter().map(|path| path.as_str()),
            ))
            .map_err(|err| TaggingError::Database(err.to_string()))?;

        while let Some(row) = rows
            .next()
            .map_err(|err| TaggingError::Database(err.to_string()))?
        {
            let stored_path: String = row
                .get(0)
                .map_err(|err| TaggingError::Database(err.to_string()))?;
            let tag: String = row
                .get(1)
                .map_err(|err| TaggingError::Database(err.to_string()))?;

            let stored_path_buf = PathBuf::from(&stored_path);

            if root_path.starts_with(&stored_path_buf) {
                tags_by_path
                    .entry(root_path.clone())
                    .or_default()
                    .insert(tag);
            }
        }
    }

    let result = tags_by_path
        .into_iter()
        .filter_map(|(path, tags)| {
            if tags.is_empty() {
                None
            } else {
                Some((path, tags.into_iter().collect::<Vec<_>>()))
            }
        })
        .collect::<BTreeMap<_, _>>();

    Ok(result)
}

fn normalize_path(path: &str) -> String {
    let path_buf = PathBuf::from(path);
    match fs::canonicalize(&path_buf) {
        Ok(canonical) => canonical.to_string_lossy().to_string(),
        Err(err) => {
            warn!(
                "Failed to canonicalize path; storing as provided: {} ({})",
                path, err
            );
            path.to_string()
        }
    }
}

fn calculate_path_depth(path: &Path) -> i64 {
    path.components()
        .filter(|component| matches!(component, Component::Normal(_)))
        .count() as i64
}

fn descendant_like_pattern(root: &str) -> String {
    let mut base = root.to_string();
    let separator = std::path::MAIN_SEPARATOR_STR;

    if !base.ends_with(separator) {
        base.push_str(separator);
    }

    let escaped = escape_for_like(&base);
    format!("{escaped}%")
}

fn escape_for_like(input: &str) -> String {
    let mut escaped = String::with_capacity(input.len());
    for ch in input.chars() {
        match ch {
            '\\' | '%' | '_' => {
                escaped.push('\\');
                escaped.push(ch);
            }
            _ => escaped.push(ch),
        }
    }

    escaped
}

#[cfg(test)]
mod tests {
    use super::*;

    struct TestPaths {
        ancestor: PathBuf,
        parent: PathBuf,
        scan_root: PathBuf,
        descendant: PathBuf,
        deep_descendant: PathBuf,
        unrelated: PathBuf,
    }

    #[cfg(windows)]
    fn sample_paths() -> TestPaths {
        let parent = PathBuf::from(r"C:\workspace");
        let scan_root = parent.join("project");
        let descendant = scan_root.join("notes.txt");
        let deep_descendant = scan_root.join("folder").join("deep.txt");
        let ancestor = PathBuf::from(r"C:\");
        let unrelated = PathBuf::from(r"C:\other");

        TestPaths {
            ancestor,
            parent,
            scan_root,
            descendant,
            deep_descendant,
            unrelated,
        }
    }

    #[cfg(not(windows))]
    fn sample_paths() -> TestPaths {
        let parent = PathBuf::from("/workspace");
        let scan_root = parent.join("project");
        let descendant = scan_root.join("notes.txt");
        let deep_descendant = scan_root.join("folder").join("deep.txt");
        let ancestor = PathBuf::from("/");
        let unrelated = PathBuf::from("/other");

        TestPaths {
            ancestor,
            parent,
            scan_root,
            descendant,
            deep_descendant,
            unrelated,
        }
    }

    fn path_to_string(path: &Path) -> String {
        path.to_string_lossy().to_string()
    }

    #[test]
    fn collects_tags_with_direct_and_inherited_entries() {
        let connection = duckdb::Connection::open_in_memory().expect("in memory db");
        ensure_schema(&connection).expect("schema");

        let paths = sample_paths();

        let insert = |path: &Path, tag: &str| {
            connection
                .execute(
                    "INSERT OR REPLACE INTO path_tags (path, tag, path_depth) VALUES (?1, ?2, ?3)",
                    duckdb::params![path_to_string(path), tag, calculate_path_depth(path)],
                )
                .expect("insert tag");
        };

        insert(&paths.parent, "parent-tag");
        insert(&paths.scan_root, "root-tag");
        insert(&paths.descendant, "desc-tag");
        insert(&paths.ancestor, "ancestor-tag");
        insert(&paths.unrelated, "other-tag");

        let tags = get_tags_for_directory(&connection, &paths.scan_root, 5).expect("fetch tags");

        assert_eq!(
            tags.get(&paths.scan_root),
            Some(&vec![
                "ancestor-tag".to_string(),
                "parent-tag".to_string(),
                "root-tag".to_string()
            ])
        );

        assert_eq!(
            tags.get(&paths.descendant),
            Some(&vec!["desc-tag".to_string()])
        );

        assert!(tags.get(&paths.unrelated).is_none());
    }

    #[test]
    fn filters_descendants_by_scan_depth() {
        let connection = duckdb::Connection::open_in_memory().expect("in memory db");
        ensure_schema(&connection).expect("schema");

        let paths = sample_paths();

        let insert = |path: &Path, tag: &str| {
            connection
                .execute(
                    "INSERT OR REPLACE INTO path_tags (path, tag, path_depth) VALUES (?1, ?2, ?3)",
                    duckdb::params![path_to_string(path), tag, calculate_path_depth(path)],
                )
                .expect("insert tag");
        };

        insert(&paths.scan_root, "root-tag");
        insert(&paths.descendant, "desc-tag");
        insert(&paths.deep_descendant, "deep-tag");

        let depth_one =
            get_tags_for_directory(&connection, &paths.scan_root, 1).expect("fetch depth 1 tags");
        assert!(depth_one.get(&paths.scan_root).is_some());
        assert!(depth_one.get(&paths.descendant).is_some());
        assert!(depth_one.get(&paths.deep_descendant).is_none());

        let depth_three =
            get_tags_for_directory(&connection, &paths.scan_root, 3).expect("fetch depth 3 tags");
        assert!(depth_three.get(&paths.deep_descendant).is_some());
    }

    #[test]
    fn inherits_tags_from_all_ancestors() {
        let connection = duckdb::Connection::open_in_memory().expect("in memory db");
        ensure_schema(&connection).expect("schema");

        let paths = sample_paths();

        let insert = |path: &Path, tag: &str| {
            connection
                .execute(
                    "INSERT OR REPLACE INTO path_tags (path, tag, path_depth) VALUES (?1, ?2, ?3)",
                    duckdb::params![path_to_string(path), tag, calculate_path_depth(path)],
                )
                .expect("insert tag");
        };

        insert(&paths.ancestor, "ancestor-tag");
        insert(&paths.parent, "parent-tag");

        let tags = get_tags_for_directory(&connection, &paths.scan_root, 5).expect("fetch tags");

        assert_eq!(
            tags.get(&paths.scan_root),
            Some(&vec!["ancestor-tag".to_string(), "parent-tag".to_string()])
        );
    }

    #[test]
    fn returns_empty_when_no_relevant_tags() {
        let connection = duckdb::Connection::open_in_memory().expect("in memory db");
        ensure_schema(&connection).expect("schema");

        let paths = sample_paths();

        let tags = get_tags_for_directory(&connection, &paths.scan_root, 3).expect("fetch tags");
        assert!(tags.is_empty());
    }
}
