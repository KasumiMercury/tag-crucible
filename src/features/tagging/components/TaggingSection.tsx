import { invoke } from "@tauri-apps/api/core";
import { Combine, SquareStack, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface TaggingSidebarItem {
  absolutePath: string;
  displayName: string;
}

interface TaggingSectionProps {
  items: TaggingSidebarItem[];
  showAggregateToggle?: boolean;
  aggregateModeEnabled?: boolean;
  onAggregateToggle?: () => void;
  onItemRemove?: (absolutePath: string) => void;
  onTagAdded?: (tag: string, paths: string[]) => void;
}

export function TaggingSection({
  items,
  showAggregateToggle = false,
  aggregateModeEnabled = false,
  onAggregateToggle,
  onItemRemove,
  onTagAdded,
}: TaggingSectionProps) {
  const [tagName, setTagName] = useState("");

  const handleAddTag = async () => {
    const trimmedTag = tagName.trim();

    if (trimmedTag === "") {
      console.warn("Tag name is empty");
      return;
    }

    if (items.length === 0) {
      console.warn("No items selected");
      return;
    }

    const paths = items.map((item) => item.absolutePath);

    try {
      await invoke("assign_tag_to_paths", {
        paths,
        tag: trimmedTag,
      });

      console.log(
        `Successfully tagged ${paths.length} items with "${trimmedTag}"`,
      );
      setTagName("");
      onTagAdded?.(trimmedTag, paths);
    } catch (error) {
      console.error("Failed to assign tag:", error);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center">
        <h2 className="text-lg font-semibold text-left">Tagging</h2>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items selected.</p>
        ) : (
          items.map((item) => {
            const handleRemove = () => {
              onItemRemove?.(item.absolutePath);
            };
            return (
              <div
                key={item.absolutePath}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2"
              >
                <code className="flex-1 text-left text-sm font-mono break-words">
                  {item.displayName}
                </code>
                {onItemRemove && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleRemove}
                    aria-label={`Remove ${item.displayName}`}
                  >
                    <X className="size-4" aria-hidden />
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
      <div className="flex flex-col mt-auto gap-2">
        {showAggregateToggle && onAggregateToggle && (
          <Button
            type="button"
            variant={aggregateModeEnabled ? "default" : "outline"}
            className="w-full"
            onClick={onAggregateToggle}
          >
            {aggregateModeEnabled ? (
              <>
                <SquareStack className="mr-2 size-4" aria-hidden />
                Tag Individually
              </>
            ) : (
              <>
                <Combine className="mr-2 size-4" aria-hidden />
                Tag as Group
              </>
            )}
          </Button>
        )}
        <Input
          type="text"
          placeholder="tag name"
          value={tagName}
          onChange={(e) => setTagName(e.target.value)}
        />
        <Button type="button" className="w-full" onClick={handleAddTag}>
          Add Tag
        </Button>
      </div>
    </div>
  );
}
