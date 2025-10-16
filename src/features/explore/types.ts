import type { DirectoryNode, FileInfo } from "@/types";

export interface DirectoryTableRow {
  id: string;
  name: string;
  node: DirectoryNode;
  info: FileInfo;
}

export interface ExploreTableData {
  rows: DirectoryTableRow[];
}
