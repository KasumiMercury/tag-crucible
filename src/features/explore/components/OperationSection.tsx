import { useMemo, useState } from "react";
import type { FileInfo } from "@/types";
import { DetailsSection } from "./DetailsSection";
import { FileSelector } from "./FileSelector";

export interface DetailsSectionItem {
  absolutePath: string;
  displayName: string;
  fileInfo: FileInfo;
}

interface OperationSectionProps {
  items: DetailsSectionItem[];
}

export function OperationSection({ items }: OperationSectionProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const currentItem = useMemo(() => {
    if (items.length === 0) {
      return null;
    }

    if (items.length === 1) {
      return items[0];
    }

    const selected = items.find((item) => item.absolutePath === selectedPath);
    return selected || items[0];
  }, [items, selectedPath]);

  useMemo(() => {
    if (items.length === 0) {
      setSelectedPath(null);
    } else if (items.length === 1) {
      setSelectedPath(items[0].absolutePath);
    } else if (
      selectedPath === null ||
      !items.find((item) => item.absolutePath === selectedPath)
    ) {
      setSelectedPath(items[0].absolutePath);
    }
  }, [items, selectedPath]);

  const selectorItems = useMemo(
    () =>
      items.map((item) => ({
        value: item.absolutePath,
        label: item.displayName,
      })),
    [items],
  );

  if (items.length === 0) {
    return <DetailsSection fileInfo={null} />;
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {items.length > 1 && (
        <FileSelector
          items={selectorItems}
          value={currentItem?.absolutePath || ""}
          onChange={setSelectedPath}
        />
      )}
      <div className="flex-1 min-h-0 overflow-hidden">
        <DetailsSection fileInfo={currentItem?.fileInfo || null} />
      </div>
    </div>
  );
}
