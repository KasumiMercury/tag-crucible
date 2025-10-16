import { useMemo, useState } from "react";
import type { DirectoryNode } from "@/types";
import { DetailsSection } from "./DetailsSection";
import { FileSelector } from "./FileSelector";
import { TagInput } from "./TagInput";

export interface DetailsSectionItem {
  absolutePath: string;
  displayName: string;
  node: DirectoryNode;
}

interface OperationSectionProps {
  items: DetailsSectionItem[];
  onTagAdded?: (tag: string, paths: string[]) => void;
}

export function OperationSection({ items, onTagAdded }: OperationSectionProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Reset index when items change
  useMemo(() => {
    if (items.length === 0) {
      setSelectedIndex(0);
    } else if (selectedIndex >= items.length) {
      setSelectedIndex(0);
    }
  }, [items, selectedIndex]);

  const currentItem = useMemo(() => {
    if (items.length === 0) {
      return null;
    }
    return items[selectedIndex] || items[0];
  }, [items, selectedIndex]);

  const selectorItems = useMemo(
    () =>
      items.map((item) => ({
        value: item.absolutePath,
        label: item.displayName,
      })),
    [items],
  );

  const targetPaths = useMemo(
    () => items.map((item) => item.absolutePath),
    [items],
  );

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col gap-4">
        <DetailsSection node={null} />
        <TagInput targetPaths={[]} onTagAdded={onTagAdded} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {items.length > 1 && (
        <FileSelector
          items={selectorItems}
          selectedIndex={selectedIndex}
          onChange={setSelectedIndex}
        />
      )}
      <div className="flex-1 min-h-0 overflow-hidden">
        <DetailsSection node={currentItem?.node || null} />
      </div>
      <TagInput targetPaths={targetPaths} onTagAdded={onTagAdded} />
    </div>
  );
}
