import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

interface FileInfo {
  path: string;
  is_directory: boolean;
  is_symlink: boolean;
  size: number;
  modified: string | null;
}

function App() {
  const [paths, setPaths] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);

  async function scanDirectory() {
    setLoading(true);
    try {
      invoke<FileInfo[]>("scan_current_directory")
        .then((res) => {
          console.log(res);
          setPaths(res);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Invocation error:", err);
          setPaths([]);
          setLoading(false);
        });
    } catch (error) {
      console.error("Failed to scan directory:", error);
      setPaths([]);
    }
  }

  return (
    <main className="pt-[10vh] flex flex-col justify-center text-center">
      <button
        onClick={scanDirectory}
        className="rounded-lg border border-transparent px-5 py-2.5 text-base font-medium bg-white text-gray-950 shadow-md transition-colors duration-200 cursor-pointer hover:border-blue-600 active:border-blue-600 active:bg-gray-200 dark:text-white dark:bg-gray-950/60 dark:active:bg-gray-950/40 outline-none"
      >
        Scan
      </button>
      {loading && <div>Loading...</div>}
      <div className="mt-5">
        {paths.map((item, index) => (
          <div key={index}>
            {item.path}/ / size:{item.size} / modified: {item.modified} /
            is_directory: {item.is_directory.toString()} / is_symlink:{" "}
            {item.is_symlink.toString()}
          </div>
        ))}
      </div>
    </main>
  );
}

export default App;
