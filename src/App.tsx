import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { CornerLeftUp, RefreshCcw, ScanSearch, Tags } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DetailsSection,
  type DetailsSectionItem,
} from "@/features/explore/components/DetailsSection";
import { ExploreTable } from "@/features/explore/components/ExploreTable";
import { useDirectoryScanner } from "@/features/explore/hooks/useDirectoryScanner";
import { exploreColumns } from "@/features/explore/tableColumns";
import type { DirectoryTableRow } from "@/features/explore/types";
import { buildExploreTableRows } from "@/features/explore/utils/buildExploreTableRows";
import { formatPathForDisplay } from "@/features/explore/utils/formatPathForDisplay";
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
    Record<string, DetailsSectionItem>
  >({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
    const formatted = formatPathForDisplay(directoryTree.info.path, 25);
    return formatted;
  }, [directoryTree]);

  const rootOwnTags = useMemo(() => {
    if (!directoryTree) {
      return [];
    }
    return directoryTree.info.own_tags;
  }, [directoryTree]);

  const rootInheritedTags = useMemo(() => {
    if (!directoryTree) {
      return [];
    }
    return directoryTree.info.inherited_tags;
  }, [directoryTree]);

  const sidebarItems = useMemo<DetailsSectionItem[]>(() => {
    return Object.values(selectedItems);
  }, [selectedItems]);

  const handleSelectionChange = (rows: DirectoryTableRow[]) => {
    const visibleRows = tableData?.rows ?? [];
    const updatedSelection: Record<string, DetailsSectionItem> = {
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
        fileInfo: row.info,
      };
    });

    setSelectedItems(updatedSelection);

    const hasSelection = Object.keys(updatedSelection).length > 0;
    setIsSidebarOpen(hasSelection);

    console.log("[Details] handleSelectionChange", {
      incomingCount: rows.length,
      nextCount: Object.keys(updatedSelection).length,
      sidebarOpen: hasSelection,
    });
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <main className="h-screen max-h-screen overflow-hidden">
      <div className="flex h-full min-h-0 w-full">
        <div className="flex min-h-0 min-w-0 h-full flex-1 flex-col gap-4 px-5 pt-10 pb-5 overflow-hidden">
          {loading && (
            <div className="text-sm text-muted-foreground">Loading...</div>
          )}
          {tableData && (
            <>
              {currentDirectoryLabel && (
                <div className="flex items-center gap-2 flex-none">
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

              <div className="flex flex-wrap gap-1 items-center">
                {rootInheritedTags.map((tag) => (
                  <Badge variant="secondary" key={tag}>
                    {tag}
                  </Badge>
                ))}
                {rootOwnTags.map((tag) => (
                  <Badge variant="default" key={tag}>
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="rounded-md border flex-1 min-h-0 overflow-hidden">
                <ExploreTable
                  columns={exploreColumns}
                  rows={tableData.rows}
                  onSelectionChange={handleSelectionChange}
                  selectedRowIds={Object.keys(selectedItems)}
                  onScanDirectory={handleScanFromRow}
                />
              </div>
            </>
          )}
        </div>
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar}>
          <DetailsSection items={sidebarItems} />
        </Sidebar>
      </div>
    </main>
  );
}

export default App;
