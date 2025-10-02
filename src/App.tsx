import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
  const [paths, setPaths] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function scanDirectory() {
    setLoading(true);
    try {
      invoke<string[]>("scan_current_directory").then((res) => {
        setPaths(res);
        setLoading(false);
      }).catch((err) => {
        console.error("Invocation error:", err);
        setPaths([`Error: ${err}`]);
        setLoading(false);
      });
    } catch (error) {
      console.error("Failed to scan directory:", error);
      setPaths([`Error: ${error}`]);
    }
  }

  return (
    <main className="container">
      <button onClick={scanDirectory}>Scan</button>
      {loading && <div>Loading...</div>}
      <div style={{ marginTop: "20px" }}>
        {paths.map((path, index) => (
          <div key={index}>{path}</div>
        ))}
      </div>
    </main>
  );
}

export default App;
