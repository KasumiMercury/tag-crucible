import type { ColumnDef } from "@tanstack/react-table";
import { Square, SquareCheckBig } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import type { DirectoryTableRow } from "@/features/explore/types";

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

export const exploreColumns: ColumnDef<DirectoryTableRow>[] = [
  {
    id: "select",
    header: ({ table }) => {
      const isAllSelected = table.getIsAllRowsSelected();
      const isSomeSelected = table.getIsSomeRowsSelected();

      return (
        <button
          type="button"
          onClick={table.getToggleAllRowsSelectedHandler()}
          className="cursor-pointer"
        >
          {isAllSelected || isSomeSelected ? (
            <SquareCheckBig size={18} className="text-blue-600" />
          ) : (
            <Square size={18} className="text-gray-400" />
          )}
        </button>
      );
    },
    cell: ({ row }) => {
      return row.getIsSelected() ? (
        <SquareCheckBig size={18} className="text-blue-600" />
      ) : (
        <Square size={18} className="text-gray-400" />
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "name",
    header: "Name",
    enableSorting: true,
  },
  {
    accessorKey: "info.tags",
    header: "Tags",
    cell: ({ row }) => {
      const tags = row.original.info.tags;
      if (tags.length === 0) {
        return <span>-</span>;
      }
      return (
        <div className="flex flex-wrap gap-1 max-w-sm">
          {tags.map((tag) => (
            <Badge variant="default" key={tag}>
              {tag}
            </Badge>
          ))}
        </div>
      );
    },
    enableSorting: false,
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
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.info;
      const b = rowB.original.info;

      // Directories always come last when sorting by size
      if (a.is_directory && !b.is_directory) return 1;
      if (!a.is_directory && b.is_directory) return -1;
      if (a.is_directory && b.is_directory) return 0;

      // Sort files by numeric size
      return a.size - b.size;
    },
  },
];
