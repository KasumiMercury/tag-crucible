export interface FileInfo {
  path: string;
  is_directory: boolean;
  is_symlink: boolean;
  size: number;
  modified: string | null;
}

export interface DirectoryNode {
  name: string;
  info: FileInfo;
  children: DirectoryNode[];
}

export interface DirectoryTableRow {
  id: string;
  name: string;
  info: FileInfo;
  isCurrentDirectory: boolean;
}

export interface ExploreTableData {
  rows: DirectoryTableRow[];
  pinnedRowIds: string[];
}
