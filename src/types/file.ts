export interface FileInfo {
  path: string;
  is_directory: boolean;
  is_symlink: boolean;
  size: number;
  hierarchy: string[];
  modified: string | null;
  own_tags: string[];
  inherited_tags: string[];
}

export interface DirectoryNode {
  name: string;
  info: FileInfo;
  children: DirectoryNode[];
}
