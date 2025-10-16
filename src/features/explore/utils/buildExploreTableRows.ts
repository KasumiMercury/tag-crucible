import type {
  DirectoryTableRow,
  ExploreTableData,
} from "@/features/explore/types";
import type { DirectoryNode } from "@/types";

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
