#[cfg(target_os = "windows")]
mod windows;

#[cfg(target_os = "windows")]
pub(crate) use windows::collect_entries;

#[cfg(not(target_os = "windows"))]
mod portable;

#[cfg(not(target_os = "windows"))]
pub(crate) use portable::collect_entries;
