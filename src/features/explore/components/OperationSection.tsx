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

  if (items.length === 0) {
    return <DetailsSection fileInfo={null} />;
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
        <DetailsSection fileInfo={currentItem?.fileInfo || null} />
      </div>
    </div>
  );
}
