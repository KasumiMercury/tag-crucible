import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import "./App.css";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
// import path from "node:path";

interface FileInfo {
  path: string;
  is_directory: boolean;
  is_symlink: boolean;
  size: number;
  modified: string | null;
}

interface Node {
  name: string;
  info: FileInfo;
  children: Node[];
}

function App() {
  const [paths, setPaths] = useState<Node | null>(null);
  const [loading, setLoading] = useState(false);

  function formatDateTime(isoString: string | null): string {
    if (!isoString) return "-";
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
  }

  async function scanDirectory() {
    setLoading(true);
    try {
      invoke<Node>("scan_current_directory")
        .then((res) => {
          console.log(res);
          setPaths(res);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Invocation error:", err);
          setPaths(null);
          setLoading(false);
        });
    } catch (error) {
      console.error("Failed to scan directory:", error);
      setPaths(null);
    }
  }

  return (
    <main className="pt-[10vh] px-5 flex flex-col justify-center text-center">
      <button
        type="button"
        onClick={scanDirectory}
        className="rounded-lg border border-transparent px-5 py-2.5 text-base font-medium bg-white text-gray-950 shadow-md transition-colors duration-200 cursor-pointer hover:border-blue-600 active:border-blue-600 active:bg-gray-200 dark:text-white dark:bg-gray-950/60 dark:active:bg-gray-950/40 outline-none"
      >
        Scan
      </button>
      {loading && <div>Loading...</div>}
      <div className="mt-5 px-5 text-start">
        {paths && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Path</TableHead>
                <TableHead>modified</TableHead>
                <TableHead>size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>.</TableCell>
                <TableCell>{formatDateTime(paths.info.modified)}</TableCell>
                <TableCell>
                  {paths.info.is_directory ? "-" : paths.info.size}
                </TableCell>
              </TableRow>
              {paths.children.map((item, _) => (
                <TableRow key={item.info.path}>
                  <TableCell>{item.info.path}</TableCell>
                  <TableCell>{formatDateTime(item.info.modified)}</TableCell>
                  <TableCell>
                    {item.info.is_directory ? "-" : item.info.size}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </main>
  );
}

export default App;
