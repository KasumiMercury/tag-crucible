import { invoke } from "@tauri-apps/api/core";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TagInputProps {
  targetPath: string | null;
  onTagAdded?: (tag: string, path: string) => void;
}

export function TagInput({ targetPath, onTagAdded }: TagInputProps) {
  const [tagName, setTagName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const inputId = useId();

  const handleAddTag = async () => {
    const trimmedTag = tagName.trim();

    if (trimmedTag === "") {
      console.warn("Tag name is empty");
      return;
    }

    if (!targetPath) {
      console.warn("No target path selected");
      return;
    }

    setIsAdding(true);

    try {
      await invoke("assign_tag_to_paths", {
        paths: [targetPath],
        tag: trimmedTag,
      });

      console.log(`Successfully tagged "${targetPath}" with "${trimmedTag}"`);
      setTagName("");
      onTagAdded?.(trimmedTag, targetPath);
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

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-medium">
        Add Tag
      </label>
      <div className="flex gap-2">
        <Input
          id={inputId}
          type="text"
          placeholder="Enter tag name"
          value={tagName}
          onChange={(e) => setTagName(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!targetPath || isAdding}
        />
        <Button
          type="button"
          onClick={handleAddTag}
          disabled={!targetPath || isAdding || tagName.trim() === ""}
        >
          {isAdding ? "Adding..." : "Add"}
        </Button>
      </div>
    </div>
  );
}
