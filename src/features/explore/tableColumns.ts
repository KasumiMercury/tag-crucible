import type { ColumnDef } from "@tanstack/react-table";

import type { DirectoryNode } from "@/features/explore/types";

function formatDateTime(isoString: string | null): string {
  if (!isoString) {
    return "-";
  }

  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

export const exploreColumns: ColumnDef<DirectoryNode>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "info.modified",
    header: "Modified",
    accessorFn: (row) => {
      return formatDateTime(row.info.modified);
    },
  },
  {
    accessorKey: "info.size",
    header: "Size",
    accessorFn: (row) => {
      return row.info.is_directory ? "-" : `${row.info.size}`;
    },
  },
];
