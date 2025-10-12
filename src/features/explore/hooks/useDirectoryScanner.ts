import { invoke } from "@tauri-apps/api/core";
import { useCallback, useMemo, useRef, useState } from "react";
import type { DirectoryNode } from "@/features/explore/types";

type ScanRequest = {
  path?: string | null;
  depth?: number;
};

type ResolvedScanTarget = {
  path: string | null;
  depth: number;
};

export interface UseDirectoryScannerOptions {
  defaultDepth?: number;
}

export interface UseDirectoryScannerValue {
  directoryTree: DirectoryNode | null;
  currentPathSegments: string[];
  loading: boolean;
  error: string | null;
  lastTarget: ResolvedScanTarget;
  scanCurrentDirectory: () => Promise<DirectoryNode | null>;
  scanPath: (path: string, depth?: number) => Promise<DirectoryNode | null>;
  rescan: () => Promise<DirectoryNode | null>;
}

const DEFAULT_DEPTH = 2;

function resolveTarget(
  current: ResolvedScanTarget,
  request: ScanRequest | undefined,
  defaultDepth: number,
): ResolvedScanTarget {
  if (!request) {
    return current;
  }

  if (request.path === null) {
    return { path: null, depth: request.depth ?? defaultDepth };
  }

  if (typeof request.path === "string") {
    return {
      path: request.path,
      depth: request.depth ?? defaultDepth,
    };
  }

  return current;
}

export function useDirectoryScanner(
  options: UseDirectoryScannerOptions = {},
): UseDirectoryScannerValue {
  const defaultDepth = options.defaultDepth ?? DEFAULT_DEPTH;

  const [directoryTree, setDirectoryTree] = useState<DirectoryNode | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTarget, setLastTarget] = useState<ResolvedScanTarget>({
    path: null,
    depth: defaultDepth,
  });

  const lastTargetRef = useRef(lastTarget);
  lastTargetRef.current = lastTarget;

  const performScan = useCallback(
    async (request?: ScanRequest): Promise<DirectoryNode | null> => {
      const nextTarget = resolveTarget(
        lastTargetRef.current,
        request,
        defaultDepth,
      );

      setLoading(true);
      setError(null);
      setLastTarget(nextTarget);

      try {
        const node = nextTarget.path
          ? await invoke<DirectoryNode>("scan_directory", {
              path: nextTarget.path,
              depth: nextTarget.depth,
            })
          : await invoke<DirectoryNode>("scan_current_directory");

        setDirectoryTree(node);
        console.log("Scanned directory:", node);
        return node;
      } catch (unknownError) {
        const message =
          unknownError instanceof Error
            ? unknownError.message
            : String(unknownError);

        setDirectoryTree(null);
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [defaultDepth],
  );

  const scanCurrentDirectory = useCallback(
    () => performScan({ path: null }),
    [performScan],
  );

  const scanPath = useCallback(
    (path: string, depth?: number) =>
      performScan({
        path,
        depth,
      }),
    [performScan],
  );

  const rescan = useCallback(() => performScan(), [performScan]);

  const currentPathSegments = useMemo(
    () => directoryTree?.info.hierarchy ?? [],
    [directoryTree],
  );

  const value = useMemo<UseDirectoryScannerValue>(
    () => ({
      directoryTree,
      currentPathSegments,
      loading,
      error,
      lastTarget,
      scanCurrentDirectory,
      scanPath,
      rescan,
    }),
    [
      directoryTree,
      currentPathSegments,
      loading,
      error,
      lastTarget,
      scanCurrentDirectory,
      scanPath,
      rescan,
    ],
  );

  return value;
}
