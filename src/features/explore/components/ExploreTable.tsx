import {
  type ColumnDef,
  type Row,
  type SortingState,
  type RowPinningState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DirectoryTableRow } from "@/features/explore/types";

interface ExploreTableProps {
  columns: ColumnDef<DirectoryTableRow>[];
  rows: DirectoryTableRow[];
  pinnedRowIds?: string[];
}

export function ExploreTable({
  columns,
  rows,
  pinnedRowIds = [],
}: ExploreTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const rowPinning = useMemo<RowPinningState | undefined>(() => {
    if (pinnedRowIds.length === 0) {
      return undefined;
    }
    return { top: pinnedRowIds };
  }, [pinnedRowIds]);

  const tableState = useMemo<
    { sorting: SortingState; rowPinning?: RowPinningState }
  >(() => {
    if (!rowPinning) {
      return { sorting };
    }
    return { sorting, rowPinning };
  }, [rowPinning, sorting]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    enableRowPinning: pinnedRowIds.length > 0,
    keepPinnedRows: true,
    getRowId: (row) => row.id,
    state: tableState,
  });

  const renderRow = (row: Row<DirectoryTableRow>) => (
    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );

  const pinnedTopRows = table.getTopRows() ?? [];
  const pinnedBottomRows = table.getBottomRows() ?? [];
  const unpinnedRows = table
    .getRowModel()
    .rows.filter((row) => !row.getIsPinned());
  const hasAnyRows =
    pinnedTopRows.length + pinnedBottomRows.length + unpinnedRows.length > 0;

  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <div
                        className={
                          header.column.getCanSort()
                            ? "cursor-pointer select-none flex items-center gap-1"
                            : ""
                        }
                        {...(header.column.getCanSort() && {
                          role: "button",
                          tabIndex: 0,
                          onClick: header.column.getToggleSortingHandler(),
                          onKeyDown: (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              header.column.getToggleSortingHandler()?.(e);
                            }
                          },
                        })}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {header.column.getCanSort() &&
                          (header.column.getIsSorted() === "asc" ? (
                            <ArrowUp size={14} />
                          ) : header.column.getIsSorted() === "desc" ? (
                            <ArrowDown size={14} />
                          ) : (
                            <ArrowUpDown size={14} />
                          ))}
                      </div>
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {hasAnyRows ? (
            <>
              {pinnedTopRows.map(renderRow)}
              {unpinnedRows.map(renderRow)}
              {pinnedBottomRows.map(renderRow)}
            </>
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
