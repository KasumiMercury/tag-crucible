import type { FileInfo } from "@/types";

export interface DirectoryTableRow {
  id: string;
  name: string;
  info: FileInfo;
}

export interface ExploreTableData {
  rows: DirectoryTableRow[];
}
