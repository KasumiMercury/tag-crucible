import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { CornerLeftUp, RefreshCcw, ScanSearch, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExploreTable } from "@/features/explore/components/ExploreTable";
import { useDirectoryScanner } from "@/features/explore/hooks/useDirectoryScanner";
import { exploreColumns } from "@/features/explore/tableColumns";
import type { DirectoryTableRow } from "@/features/explore/types";
import { buildExploreTableRows } from "@/features/explore/utils/buildExploreTableRows";
import { formatPathForDisplay } from "@/features/explore/utils/formatPathForDisplay";
import {
  TaggingSection,
  type TaggingSidebarItem,
} from "@/features/tagging/components/TaggingSection";
import { Sidebar } from "@/Sidebar";

function joinPathSegments(segments: string[], separator: string): string {
  if (segments.length === 0) {
    return "";
  }

  return segments.slice(1).reduce<string>((accumulator, segment) => {
    if (accumulator.endsWith(separator)) {
      return `${accumulator}${segment}`;
    }
    return `${accumulator}${separator}${segment}`;
  }, segments[0]);
}

function App() {
  const [selectedItems, setSelectedItems] = useState<
    Record<string, TaggingSidebarItem>
  >({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAggregateTaggingEnabled, setIsAggregateTaggingEnabled] =
    useState(false);
  const {
    directoryTree,
    loading,
    error,
    currentPathSegments,
    scanCurrentDirectory,
    scanPath,
    rescan,
  } = useDirectoryScanner();

  const initialScanTriggered = useRef(false);
  useEffect(() => {
    if (initialScanTriggered.current) {
      return;
    }
    initialScanTriggered.current = true;
    void scanCurrentDirectory();
  }, [scanCurrentDirectory]);

  useEffect(() => {
    if (!error) {
      return;
    }
    console.error("Failed to scan directory:", error);
  }, [error]);

  const handleRescan = useCallback(() => {
    void rescan();
  }, [rescan]);

  const pathSeparator = useMemo(() => {
    if (!directoryTree) {
      return "/";
    }

    return directoryTree.info.path.includes("\\") ? "\\" : "/";
  }, [directoryTree]);

  const parentPath = useMemo(() => {
    if (currentPathSegments.length <= 1) {
      return null;
    }

    const parentSegments = currentPathSegments.slice(0, -1);
    if (parentSegments.length === 0) {
      return null;
    }

    const joined = joinPathSegments(parentSegments, pathSeparator);
    return joined === directoryTree?.info.path ? null : joined;
  }, [currentPathSegments, directoryTree, pathSeparator]);

  const handleDirectorySelect = useCallback(async () => {
    if (loading) {
      return;
    }

    try {
      const selection = await open({
        defaultPath: directoryTree?.info.path,
        directory: true,
        multiple: false,
      });

      if (!selection) {
        return;
      }

      const nextPath = Array.isArray(selection) ? selection[0] : selection;
      if (!nextPath) {
        return;
      }

      await scanPath(nextPath);
    } catch (selectionError) {
      console.error("Failed to select directory:", selectionError);
    }
  }, [loading, scanPath, directoryTree]);

  const handleScanParent = useCallback(() => {
    if (!parentPath) {
      return;
    }

    void scanPath(parentPath);
  }, [parentPath, scanPath]);

  const handleScanFromRow = useCallback(
    (path: string) => {
      void scanPath(path);
    },
    [scanPath],
  );

  const tableData = useMemo(() => {
    if (!directoryTree) {
      return null;
    }
    return buildExploreTableRows(directoryTree);
  }, [directoryTree]);

  const currentDirectoryLabel = useMemo(() => {
    if (!directoryTree) {
      return null;
    }
    const formatted = formatPathForDisplay(directoryTree.info.path, 50);
    return formatted;
  }, [directoryTree]);

  const isAllRowsSelected = useMemo(() => {
    if (!tableData || tableData.rows.length === 0) {
      return false;
    }
    return tableData.rows.every((row) => !!selectedItems[row.id]);
  }, [tableData, selectedItems]);

  const sidebarItems = useMemo<TaggingSidebarItem[]>(() => {
    if (isAggregateTaggingEnabled && directoryTree) {
      return [
        {
          absolutePath: directoryTree.info.path,
          displayName: directoryTree.info.path,
        },
      ];
    }
    return Object.values(selectedItems);
  }, [directoryTree, isAggregateTaggingEnabled, selectedItems]);

  const handleSelectionChange = (rows: DirectoryTableRow[]) => {
    const visibleRows = tableData?.rows ?? [];
    const updatedSelection: Record<string, TaggingSidebarItem> = {
      ...selectedItems,
    };

    // Remove deselected items from currently visible rows.
    visibleRows.forEach((row) => {
      if (!rows.some((selectedRow) => selectedRow.id === row.id)) {
        delete updatedSelection[row.id];
      }
    });

    // Add or refresh newly selected rows.
    rows.forEach((row) => {
      updatedSelection[row.id] = {
        absolutePath: row.info.path,
        displayName: row.name,
      };
    });

    setSelectedItems(updatedSelection);

    const hasSelection = Object.keys(updatedSelection).length > 0;
    setIsSidebarOpen(hasSelection || isAggregateTaggingEnabled);
    if (!hasSelection) {
      setIsAggregateTaggingEnabled(false);
    }

    console.log("[Tagging] handleSelectionChange", {
      incomingCount: rows.length,
      nextCount: Object.keys(updatedSelection).length,
      sidebarOpen: hasSelection || isAggregateTaggingEnabled,
    });

    const willSelectAllRows =
      !!tableData &&
      tableData.rows.length > 0 &&
      tableData.rows.every((row) => updatedSelection[row.id]);
    if (!willSelectAllRows) {
      setIsAggregateTaggingEnabled(false);
    }
  };

  const handleSidebarItemRemove = (absolutePath: string) => {
    if (
      isAggregateTaggingEnabled &&
      directoryTree?.info.path === absolutePath
    ) {
      setSelectedItems({});
      setIsAggregateTaggingEnabled(false);
      return;
    }

    if (!selectedItems[absolutePath]) {
      return;
    }

    const nextSelection = { ...selectedItems };
    delete nextSelection[absolutePath];
    setSelectedItems(nextSelection);

    setIsAggregateTaggingEnabled((previous) => {
      if (!previous) {
        return previous;
      }
      if (!tableData || tableData.rows.length === 0) {
        return false;
      }
      const allRowsStillSelected = tableData.rows.every(
        (row) => !!nextSelection[row.id],
      );
      return allRowsStillSelected;
    });

    const hasRemainingSelections = Object.keys(nextSelection).length > 0;
    if (!hasRemainingSelections) {
      setIsAggregateTaggingEnabled(false);
    }
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
    setIsAggregateTaggingEnabled(false);
  };

  const toggleAggregateTagging = () => {
    if (!isAllRowsSelected) {
      return;
    }
    setIsAggregateTaggingEnabled((previous) => !previous);
  };

  return (
    <main className="h-screen overflow-hidden">
      <div className="flex h-full w-full">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 px-5 pt-[10vh] overflow-y-auto">
          <div className="flex w-full flex-col items-stretch gap-2">
            {loading && (
              <div className="text-sm text-muted-foreground">Loading...</div>
            )}
          </div>
          {tableData && (
            <div className="flex flex-col gap-2 text-start">
              {currentDirectoryLabel && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    aria-label="Scan parent directory"
                    onClick={handleScanParent}
                    disabled={!parentPath || loading}
                  >
                    <CornerLeftUp className="size-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    aria-label="Choose directory to scan"
                    onClick={handleDirectorySelect}
                    disabled={loading}
                    className="flex-1 truncate text-sm"
                  >
                    <ScanSearch className="size-4 mr-2" aria-hidden />
                    {currentDirectoryLabel}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRescan}
                    aria-label="Rescan directory"
                    disabled={loading}
                  >
                    <RefreshCcw className="size-4" aria-hidden />
                  </Button>
                  {!isSidebarOpen && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsSidebarOpen(true)}
                      aria-label="Open tagging sidebar"
                    >
                      <Tags className="size-4" aria-hidden />
                    </Button>
                  )}
                </div>
              )}
              <ExploreTable
                columns={exploreColumns}
                rows={tableData.rows}
                onSelectionChange={handleSelectionChange}
                selectedRowIds={Object.keys(selectedItems)}
                onScanDirectory={handleScanFromRow}
              />
            </div>
          )}
        </div>
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar}>
          <TaggingSection
            items={sidebarItems}
            showAggregateToggle={isAllRowsSelected}
            aggregateModeEnabled={isAggregateTaggingEnabled}
            onAggregateToggle={toggleAggregateTagging}
            onItemRemove={handleSidebarItemRemove}
          />
        </Sidebar>
      </div>
    </main>
  );
}

export default App;
