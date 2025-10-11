import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type Row,
  type RowSelectionState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

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
  onSelectionChange?: (selectedRows: DirectoryTableRow[]) => void;
  selectedRowIds?: string[];
}

export function ExploreTable({
  columns,
  rows,
  onSelectionChange,
  selectedRowIds,
}: ExploreTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const selectionChangeCallbackRef = useRef(onSelectionChange);

  useEffect(() => {
    selectionChangeCallbackRef.current = onSelectionChange;
  }, [onSelectionChange]);

  const handleRowSelectionChange = (
    updater:
      | RowSelectionState
      | ((prev: RowSelectionState) => RowSelectionState),
  ) => {
    setRowSelection((previous) => {
      const next = typeof updater === "function" ? updater(previous) : updater;
      if (selectionChangeCallbackRef.current) {
        const selectedRows = rows.filter((row) => next[row.id]);
        queueMicrotask(() => {
          selectionChangeCallbackRef.current?.(selectedRows);
        });
      }
      return next;
    });
  };

  const rowsById = useMemo(() => {
    return new Map(rows.map((row) => [row.id, row]));
  }, [rows]);

  useEffect(() => {
    if (selectedRowIds === undefined) {
      return;
    }

    const nextSelection: RowSelectionState = {};
    selectedRowIds.forEach((id) => {
      if (rowsById.has(id)) {
        nextSelection[id] = true;
      }
    });

    setRowSelection((previous) => {
      if (shallowEqualRowSelection(previous, nextSelection)) {
        return previous;
      }
      return nextSelection;
    });
  }, [rowsById, selectedRowIds]);

  const tableState = useMemo(
    () => ({ sorting, rowSelection }),
    [sorting, rowSelection],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onRowSelectionChange: handleRowSelectionChange,
    state: tableState,
  });

  const renderRow = (row: Row<DirectoryTableRow>) => (
    <TableRow
      key={row.id}
      data-state={row.getIsSelected() && "selected"}
      onClick={row.getToggleSelectedHandler()}
      className="cursor-pointer"
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );

  const visibleRows = table.getRowModel().rows;
  const hasAnyRows = visibleRows.length > 0;

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
            visibleRows.map(renderRow)
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

function shallowEqualRowSelection(
  a: RowSelectionState,
  b: RowSelectionState,
): boolean {
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  for (let index = 0; index < aKeys.length; index += 1) {
    if (aKeys[index] !== bKeys[index]) {
      return false;
    }
  }
  return true;
}
