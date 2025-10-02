import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
  const [paths, setPaths] = useState<string[]>([]);

  async function scanDirectory() {
    try {
      const result = await invoke<string[]>("scan_current_directory");
      setPaths(result);
    } catch (error) {
      console.error("Failed to scan directory:", error);
      setPaths([`Error: ${error}`]);
    }
  }

  return (
    <main className="container">
      <button onClick={scanDirectory}>Scan</button>
      <div style={{ marginTop: "20px" }}>
        {paths.map((path, index) => (
          <div key={index}>{path}</div>
        ))}
      </div>
    </main>
  );
}

export default App;
