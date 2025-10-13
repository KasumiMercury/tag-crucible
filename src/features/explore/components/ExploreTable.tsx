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
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import type { DirectoryTableRow } from "@/features/explore/types";

interface ExploreTableProps {
  columns: ColumnDef<DirectoryTableRow>[];
  rows: DirectoryTableRow[];
  onSelectionChange?: (selectedRows: DirectoryTableRow[]) => void;
  selectedRowIds?: string[];
  onScanDirectory?: (path: string) => void;
}

export function ExploreTable({
  columns,
  rows,
  onSelectionChange,
  selectedRowIds,
  onScanDirectory,
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

  const visibleColumns = table.getVisibleLeafColumns();
  const gridTemplateColumns = `repeat(${visibleColumns.length || 1}, minmax(0, 1fr))`;

  const renderRow = (row: Row<DirectoryTableRow>) => {
    const { info } = row.original;
    const canScanDirectory = info.is_directory && !!onScanDirectory;

    return (
      <ContextMenu key={row.id}>
        <ContextMenuTrigger asChild>
          <div
            data-state={row.getIsSelected() && "selected"}
            onClick={row.getToggleSelectedHandler()}
            className={cn(
              "grid cursor-pointer items-center border-b transition-colors hover:bg-muted/50",
              row.getIsSelected() && "bg-muted",
            )}
            style={{ gridTemplateColumns }}
          >
            {row.getVisibleCells().map((cell) => (
              <div
                key={cell.id}
                className="p-2 whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]"
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </div>
            ))}
          </div>
        </ContextMenuTrigger>
        {canScanDirectory ? (
          <ContextMenuContent>
            <ContextMenuItem
              onSelect={() => {
                void onScanDirectory?.(info.path);
              }}
            >
              <Search size={14} className="mr-1" />
              Scan this directory
            </ContextMenuItem>
          </ContextMenuContent>
        ) : null}
      </ContextMenu>
    );
  };

  const visibleRows = table.getRowModel().rows;
  const hasAnyRows = visibleRows.length > 0;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="h-full w-full overflow-x-auto">
        <div className="flex h-full min-h-0 w-full flex-col">
          <div className="min-w-full flex-none">
            {table.getHeaderGroups().map((headerGroup) => (
              <div
                key={headerGroup.id}
                className="grid border-b bg-background text-sm"
                style={{ gridTemplateColumns }}
              >
                {headerGroup.headers.map((header) => {
                  return (
                    <div
                      key={header.id}
                      className={cn(
                        "text-foreground flex h-10 items-center gap-1 px-2 font-medium whitespace-nowrap",
                        header.column.getCanSort() &&
                          "cursor-pointer select-none",
                      )}
                      style={{
                        gridColumn: `span ${header.colSpan} / span ${header.colSpan}`,
                      }}
                      {...(header.column.getCanSort() && {
                        role: "button" as const,
                        tabIndex: 0,
                        onClick: header.column.getToggleSortingHandler(),
                        onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            header.column.getToggleSortingHandler()?.(event);
                          }
                        },
                      })}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
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
                  );
                })}
              </div>
            ))}
          </div>
          <div className="min-w-full flex-1 min-h-0 overflow-y-auto">
            {hasAnyRows ? (
              visibleRows.map(renderRow)
            ) : (
              <div
                className="grid h-24 place-items-center border-b p-4 text-sm text-muted-foreground"
                style={{ gridTemplateColumns }}
              >
                <span className="col-span-full">No results.</span>
              </div>
            )}
          </div>
        </div>
      </div>
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
