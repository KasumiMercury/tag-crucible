import { useId, useMemo, useState } from "react";
import { FileDetails } from "@/components/file-details";
import { Select } from "@/components/ui/select";
import type { FileInfo } from "@/types";

export interface DetailsSectionItem {
  absolutePath: string;
  displayName: string;
  fileInfo: FileInfo;
}

interface DetailsSectionProps {
  items: DetailsSectionItem[];
}

export function DetailsSection({ items }: DetailsSectionProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const selectId = useId();

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

  // Reset selection when items change
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

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col gap-4">
        <h2 className="text-lg font-semibold">Details</h2>
        <p className="text-sm text-muted-foreground">No items selected.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <h2 className="text-lg font-semibold">Details</h2>

      {items.length > 1 && (
        <div>
          <label htmlFor={selectId} className="sr-only">
            Select item to view details
          </label>
          <Select
            id={selectId}
            value={currentItem?.absolutePath || ""}
            onChange={(e) => setSelectedPath(e.target.value)}
          >
            {items.map((item) => (
              <option key={item.absolutePath} value={item.absolutePath}>
                {item.displayName}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {currentItem && <FileDetails fileInfo={currentItem.fileInfo} />}
      </div>
    </div>
  );
}
