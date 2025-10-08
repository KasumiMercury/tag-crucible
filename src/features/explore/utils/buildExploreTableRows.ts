import type {
  DirectoryNode,
  DirectoryTableRow,
  ExploreTableData,
} from "@/features/explore/types";

export function buildExploreTableRows(
  directory: DirectoryNode,
  options: { currentDirectoryLabel?: string } = {},
): ExploreTableData {
  const currentDirectoryLabel = options.currentDirectoryLabel ?? ".";

  const currentDirectoryRow: DirectoryTableRow = {
    id: directory.info.path,
    name: currentDirectoryLabel,
    info: directory.info,
    isCurrentDirectory: true,
  };

  const childRows: DirectoryTableRow[] = directory.children.map((child) => ({
    id: child.info.path,
    name: child.name,
    info: child.info,
    isCurrentDirectory: false,
  }));

  return {
    rows: [currentDirectoryRow, ...childRows],
    pinnedRowIds: [directory.info.path],
  };
}
