import type {
  DirectoryNode,
  DirectoryTableRow,
  ExploreTableData,
} from "@/features/explore/types";

export function buildExploreTableRows(
  directory: DirectoryNode,
): ExploreTableData {
  const rows: DirectoryTableRow[] = directory.children.map((child) => ({
    id: child.info.path,
    name: child.name,
    info: child.info,
  }));

  return { rows };
}
