import { invoke } from "@tauri-apps/api/core";
import { useMemo, useState } from "react";
import "./App.css";
import { ExploreTable } from "@/features/explore/components/ExploreTable";
import { exploreColumns } from "@/features/explore/tableColumns";
import type { DirectoryNode } from "@/features/explore/types";
import { buildExploreTableRows } from "@/features/explore/utils/buildExploreTableRows";

function App() {
  const [directoryTree, setDirectoryTree] = useState<DirectoryNode | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  const tableData = useMemo(() => {
    if (!directoryTree) {
      return null;
    }
    return buildExploreTableRows(directoryTree);
  }, [directoryTree]);

  const scanDirectory = async () => {
    setLoading(true);
    try {
      const result = await invoke<DirectoryNode>("scan_current_directory");
      setDirectoryTree(result);
    } catch (error) {
      console.error("Failed to scan directory:", error);
      setDirectoryTree(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="pt-[10vh] px-5 flex flex-col justify-center text-center">
      <button
        type="button"
        onClick={scanDirectory}
        disabled={loading}
        className="rounded-lg border border-transparent px-5 py-2.5 text-base font-medium bg-white text-gray-950 shadow-md transition-colors duration-200 cursor-pointer hover:border-blue-600 active:border-blue-600 active:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed dark:text-white dark:bg-gray-950/60 dark:active:bg-gray-950/40 outline-none"
      >
        {loading ? "Scanning..." : "Scan"}
      </button>
      {loading && <div className="mt-2">Loading...</div>}
      {tableData && (
        <div className="mt-5 px-5 text-start">
          <ExploreTable
            columns={exploreColumns}
            rows={tableData.rows}
            pinnedRowIds={tableData.pinnedRowIds}
          />
        </div>
      )}
    </main>
  );
}

export default App;
