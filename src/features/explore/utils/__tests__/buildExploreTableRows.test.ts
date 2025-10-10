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

  it("returns rows for each child directory entry", () => {
    const { rows } = buildExploreTableRows(sampleNode);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: "/root/dir",
      name: "dir",
      info: sampleNode.children[0]!.info,
    });
    expect(rows[1]).toMatchObject({
      id: "/root/example.txt",
      name: "example.txt",
      info: sampleNode.children[1]!.info,
    });
  });

  it("returns an empty list when the directory has no children", () => {
    const emptyNode: DirectoryNode = {
      name: "empty",
      info: baseDirectoryInfo,
      children: [],
    };

    const { rows } = buildExploreTableRows(emptyNode);

    expect(rows).toEqual([]);
  });
});
