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
import {
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DirectoryTableRow } from "@/features/explore/types";
import { cn } from "@/lib/utils";

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

  const handleRowClick = (
    row: Row<DirectoryTableRow>,
    event: React.MouseEvent,
  ) => {
    const isMultiSelectKey = event.ctrlKey || event.metaKey;

    if (isMultiSelectKey) {
      row.toggleSelected();
    } else {
      const isCurrentlySelected = row.getIsSelected();

      handleRowSelectionChange({});

      if (!isCurrentlySelected) {
        handleRowSelectionChange({ [row.id]: true });
      }
    }
  };

  const renderRow = (row: Row<DirectoryTableRow>) => {
    const { node } = row.original;
    const canScanDirectory = node.info.is_directory && !!onScanDirectory;

    return (
      <ContextMenu key={row.id}>
        <ContextMenuTrigger asChild>
          <TableRow
            data-state={row.getIsSelected() && "selected"}
            onClick={(event) => handleRowClick(row, event)}
            className={cn("cursor-pointer", row.getIsSelected() && "bg-muted")}
            style={{ gridTemplateColumns }}
          >
            {row.getVisibleCells().map((cell) => (
              <TableCell
                key={cell.id}
                className="p-2 whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] w-fit"
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        </ContextMenuTrigger>
        {canScanDirectory ? (
          <ContextMenuContent>
            <ContextMenuItem
              onSelect={() => {
                void onScanDirectory?.(node.info.path);
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
      <Table className="h-full w-full overflow-x-auto">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="p-2">
                  {header.isPlaceholder ? null : header.column.getCanSort() ? (
                    <button
                      type="button"
                      className="inline-flex w-full items-center gap-2 cursor-pointer select-none"
                      onClick={header.column.getToggleSortingHandler()}
                      onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          header.column.getToggleSortingHandler()?.(e);
                        }
                      }}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {{
                        asc: <ArrowUp size={14} />,
                        desc: <ArrowDown size={14} />,
                      }[header.column.getIsSorted() as string] ?? (
                        <ArrowUpDown size={14} />
                      )}
                    </button>
                  ) : (
                    flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {hasAnyRows ? (
            visibleRows.map(renderRow)
          ) : (
            <TableRow>
              <TableCell colSpan={table.getVisibleLeafColumns().length}>
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No data to display.
                </div>
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
