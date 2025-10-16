#[cfg(target_os = "windows")]
pub mod property;

#[cfg(not(target_os = "windows"))]
pub mod windows_tags {
    use crate::scan::FileInfo;
    use std::path::Path;

    pub fn enrich_with_windows_tags(_root: &Path, _entries: &mut [FileInfo]) {
        // Windows以外の環境ではWinRTタグ取得は行わない
    }
}
