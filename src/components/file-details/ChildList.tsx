import { ChevronDown, ChevronUp, File, Folder, Link } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatDateTime, formatFileSize } from "@/lib/format";
import type { DirectoryNode } from "@/types";

interface ChildListProps {
  items: DirectoryNode[];
}

export function ChildList({ items }: ChildListProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (items.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        This directory is empty.
      </div>
    );
  }
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="w-full flex flex-col gap-2"
    >
      <CollapsibleTrigger asChild>
        <Button variant="outline">
          Child Items ({items.length}){isOpen ? <ChevronUp /> : <ChevronDown />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-2">
          {items.map((child) => {
            const TypeIcon = child.info.is_symlink
              ? Link
              : child.info.is_directory
                ? Folder
                : File;

            return (
              <div
                key={child.info.path}
                className="flex items-center gap-3 p-2 rounded-md bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <TypeIcon className="size-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {child.name}
                  </div>
                  <div className="text-xs text-muted-foreground flex gap-3">
                    {!child.info.is_directory && (
                      <span>{formatFileSize(child.info.size)}</span>
                    )}
                    {child.info.modified && (
                      <span>{formatDateTime(child.info.modified)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
