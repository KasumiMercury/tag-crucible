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
		<main className="container">
			<button onClick={scanDirectory}>Scan</button>
			{loading && <div>Loading...</div>}
			<div style={{ marginTop: "20px" }}>
				{paths.map((item, index) => (
					<div key={index}>
						{item.path}/ / size:{item.size} / modified: {item.modified} / is_directory: {item.is_directory.toString()} / is_symlink: {item.is_symlink.toString()}
					</div>
				))}
			</div>
		</main>
	);
}

export default App;
