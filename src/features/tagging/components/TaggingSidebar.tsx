import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TaggingSidebarProps {
  isOpen: boolean;
  paths: string[];
  onClose: () => void;
}

export function TaggingSidebar({
  isOpen,
  paths,
  onClose,
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
            {paths.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No items selected.
              </p>
            ) : (
              paths.map((path) => (
                <code
                  key={`${path}`}
                  className="block rounded-md border border-border bg-background px-3 py-2 text-left text-sm font-mono break-words"
                >
                  {path}
                </code>
              ))
            )}
          </div>
          <div className="flex flex-col mt-auto gap-2">
            <Input type="text" placeholder="tag name" />
            <Button className="w-full">Add Tag</Button>
          </div>
        </div>
      )}
    </aside>
  );
}
