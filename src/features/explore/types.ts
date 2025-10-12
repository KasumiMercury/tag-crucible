export interface FileInfo {
  path: string;
  is_directory: boolean;
  is_symlink: boolean;
  size: number;
  hierarchy: string[];
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
}

export interface ExploreTableData {
  rows: DirectoryTableRow[];
}
