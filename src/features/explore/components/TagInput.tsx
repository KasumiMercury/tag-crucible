import { invoke } from "@tauri-apps/api/core";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TagInputProps {
  targetPaths: string[];
  onTagAdded?: (tag: string, paths: string[]) => void;
}

export function TagInput({ targetPaths, onTagAdded }: TagInputProps) {
  const [tagName, setTagName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const inputId = useId();

  const handleAddTag = async () => {
    const trimmedTag = tagName.trim();

    if (trimmedTag === "") {
      console.warn("Tag name is empty");
      return;
    }

    if (targetPaths.length === 0) {
      console.warn("No target paths selected");
      return;
    }

    setIsAdding(true);

    try {
      await invoke("assign_tag_to_paths", {
        paths: targetPaths,
        tag: trimmedTag,
      });

      const itemCount = targetPaths.length;
      const itemText = itemCount === 1 ? "item" : "items";
      console.log(
        `Successfully tagged ${itemCount} ${itemText} with "${trimmedTag}"`,
      );
      setTagName("");
      onTagAdded?.(trimmedTag, targetPaths);
    } catch (error) {
      console.error("Failed to assign tag:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleAddTag();
    }
  };

  const labelText =
    targetPaths.length > 1
      ? `Add Tag (${targetPaths.length} items)`
      : "Add Tag";

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-medium">
        {labelText}
      </label>
      <div className="flex gap-2">
        <Input
          id={inputId}
          type="text"
          placeholder="Enter tag name"
          value={tagName}
          onChange={(e) => setTagName(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={targetPaths.length === 0 || isAdding}
        />
        <Button
          type="button"
          onClick={handleAddTag}
          disabled={
            targetPaths.length === 0 || isAdding || tagName.trim() === ""
          }
        >
          {isAdding ? "Adding..." : "Add"}
        </Button>
      </div>
    </div>
  );
}
