import { describe, expect, it } from "vitest";

import type { DirectoryNode } from "@/features/explore/types";
import { buildExploreTableRows } from "@/features/explore/utils/buildExploreTableRows";

describe("buildExploreTableRows", () => {
  const baseDirectoryInfo = {
    path: "/root",
    is_directory: true,
    is_symlink: false,
    size: 0,
    modified: "2025-01-01T12:00:00.000Z",
  };

  const sampleNode: DirectoryNode = {
    name: "root",
    info: baseDirectoryInfo,
    children: [
      {
        name: "dir",
        info: {
          path: "/root/dir",
          is_directory: true,
          is_symlink: false,
          size: 0,
          modified: "2025-01-01T12:34:56.000Z",
        },
        children: [],
      },
      {
        name: "example.txt",
        info: {
          path: "/root/example.txt",
          is_directory: false,
          is_symlink: false,
          size: 1234,
          modified: "2025-01-02T08:09:10.000Z",
        },
        children: [],
      },
    ],
  };

  it("adds current directory row with '.' label and returns pinned ID", () => {
    const { rows, pinnedRowIds } = buildExploreTableRows(sampleNode);

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      id: baseDirectoryInfo.path,
      name: ".",
      info: baseDirectoryInfo,
      isCurrentDirectory: true,
    });

    expect(rows.slice(1).map((row) => row.name)).toEqual(["dir", "example.txt"]);
    expect(rows[1]).toMatchObject({
      id: "/root/dir",
      isCurrentDirectory: false,
    });

    expect(pinnedRowIds).toEqual([baseDirectoryInfo.path]);
  });
});
