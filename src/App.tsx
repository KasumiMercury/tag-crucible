import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import "./App.css";
import type { ColumnDef } from "@tanstack/react-table";
import { ExploreTable } from "./components/ExploreTable";

interface FileInfo {
  path: string;
  is_directory: boolean;
  is_symlink: boolean;
  size: number;
  modified: string | null;
}

interface DirectoryNode {
  name: string;
  info: FileInfo;
  children: DirectoryNode[];
}

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

const columns: ColumnDef<DirectoryNode>[] = [
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

function App() {
  const [directoryTree, setDirectoryTree] = useState<DirectoryNode | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

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

  const tableData = directoryTree
    ? [{ ...directoryTree, name: "." }, ...directoryTree.children]
    : [];

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
      <div className="mt-5 px-5 text-start">
        <ExploreTable columns={columns} data={tableData} />
      </div>
    </main>
  );
}

export default App;
