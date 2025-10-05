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
