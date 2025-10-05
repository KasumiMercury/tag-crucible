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

function App() {
	const [directoryTree, setDirectoryTree] = useState<DirectoryNode | null>(
		null,
	);
	const [loading, setLoading] = useState(false);

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

	const renderRows = (node: DirectoryNode, depth = 0): JSX.Element[] => {
		const rows: JSX.Element[] = [
			<TableRow key={node.info.path}>
				<TableCell style={{ paddingLeft: depth * 16 }}>
					{depth === 0 ? "." : node.name}
				</TableCell>
				<TableCell>{formatDateTime(node.info.modified)}</TableCell>
				<TableCell>{node.info.is_directory ? "-" : node.info.size}</TableCell>
			</TableRow>,
		];

		for (const child of node.children) {
			rows.push(...renderRows(child, depth + 1));
		}

		return rows;
	};

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
			<div className="mt-5 px-5 text-start">
				{directoryTree && (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Path</TableHead>
								<TableHead>Modified</TableHead>
								<TableHead>Size</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							<TableRow>
								<TableCell>.</TableCell>
								<TableCell>
									{formatDateTime(directoryTree.info.modified)}
								</TableCell>
								<TableCell>-</TableCell>
							</TableRow>
							{directoryTree.children.map((child) => (
								<TableRow key={child.info.path}>
									<TableCell>{child.name}</TableCell>
									<TableCell>{formatDateTime(child.info.modified)}</TableCell>
									<TableCell>
										{child.info.is_directory ? "-" : child.info.size}
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
