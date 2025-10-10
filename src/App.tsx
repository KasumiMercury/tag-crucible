import { invoke } from "@tauri-apps/api/core";
import { useMemo, useState } from "react";
import "./App.css";
import { ScanSearch, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExploreTable } from "@/features/explore/components/ExploreTable";
import { exploreColumns } from "@/features/explore/tableColumns";
import type {
  DirectoryNode,
  DirectoryTableRow,
} from "@/features/explore/types";
import { buildExploreTableRows } from "@/features/explore/utils/buildExploreTableRows";
import { formatPathForDisplay } from "@/features/explore/utils/formatPathForDisplay";
import { TaggingSidebar } from "@/features/tagging/components/TaggingSidebar";

function App() {
  const [directoryTree, setDirectoryTree] = useState<DirectoryNode | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState<DirectoryTableRow[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    return formatPathForDisplay(directoryTree.info.path, 50);
  }, [directoryTree]);

  const selectedPaths = useMemo(
    () => selectedRows.map((row) => row.info.path),
    [selectedRows],
  );

  const handleSelectionChange = (rows: DirectoryTableRow[]) => {
    setSelectedRows(rows);
    if (rows.length > 0) {
      setIsSidebarOpen(true);
    } else {
      setIsSidebarOpen(false);
    }
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const scanDirectory = async () => {
    setLoading(true);
    setSelectedRows([]);
    setIsSidebarOpen(false);
    try {
      const result = await invoke<DirectoryNode>("scan_current_directory");
      setDirectoryTree(result);
    } catch (error) {
      console.error("Failed to scan directory:", error);
      setDirectoryTree(null);
      setSelectedRows([]);
      setIsSidebarOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="h-screen">
      <div className="flex h-full w-full">
        <div className="flex min-w-0 flex-1 flex-col gap-4 px-5 pt-[10vh]">
          <div className="flex w-full flex-col items-stretch gap-2">
            <button
              type="button"
              onClick={scanDirectory}
              disabled={loading}
              className="w-full rounded-lg border border-transparent px-5 py-2.5 text-base font-medium bg-white text-gray-950 shadow-md transition-colors duration-200 cursor-pointer hover:border-blue-600 active:border-blue-600 active:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed dark:text-white dark:bg-gray-950/60 dark:active:bg-gray-950/40 outline-none"
            >
              {loading ? "Scanning..." : "Scan"}
            </button>
            {loading && (
              <div className="text-sm text-muted-foreground">Loading...</div>
            )}
          </div>
          {tableData && (
            <div className="flex flex-col gap-2 text-start">
              {currentDirectoryLabel && (
                <div className="flex items-center gap-2">
                  <span title={directoryTree?.info.path}></span>
                  <Button
                    type="button"
                    variant="outline"
                    alia-label="Scan directory"
                    className="flex-1 truncate text-sm"
                  >
				<ScanSearch className="size-4 mr-2" aria-hidden />
                    {currentDirectoryLabel}
                  </Button>
                  {!isSidebarOpen && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsSidebarOpen(true)}
                      aria-label="Open tagging sidebar"
                      className="ml-auto"
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
              />
            </div>
          )}
        </div>
        <TaggingSidebar
          isOpen={isSidebarOpen}
          paths={selectedPaths}
          onClose={closeSidebar}
        />
      </div>
    </main>
  );
}

export default App;
