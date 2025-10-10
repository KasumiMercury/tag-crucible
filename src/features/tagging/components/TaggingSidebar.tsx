import { Combine, SquareStack, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface TaggingSidebarItem {
  absolutePath: string;
  displayName: string;
}

interface TaggingSidebarProps {
  isOpen: boolean;
  items: TaggingSidebarItem[];
  onClose: () => void;
  showAggregateToggle?: boolean;
  aggregateModeEnabled?: boolean;
  onAggregateToggle?: () => void;
}

export function TaggingSidebar({
  isOpen,
  items,
  onClose,
  showAggregateToggle = false,
  aggregateModeEnabled = false,
  onAggregateToggle,
}: TaggingSidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-l border-border bg-muted/40 transition-[width] duration-300 ease-in-out overflow-hidden py-6",
        isOpen ? "w-80 px-5" : "w-0 px-0",
      )}
      aria-hidden={!isOpen}
    >
      {isOpen && (
        <div className="flex h-full flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-left">Tagging</h2>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close sidebar"
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No items selected.
              </p>
            ) : (
              items.map((item) => (
                <code
                  key={item.absolutePath}
                  className="block rounded-md border border-border bg-background px-3 py-2 text-left text-sm font-mono break-words"
                >
                  {item.displayName}
                </code>
              ))
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
            <Input type="text" placeholder="tag name" />
            <Button className="w-full">Add Tag</Button>
          </div>
        </div>
      )}
    </aside>
  );
}
