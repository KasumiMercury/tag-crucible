import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}

export function Sidebar({ isOpen, onClose, children }: SidebarProps) {
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
          <div className="flex items-center justify-end">
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
          <div className="flex h-full flex-col gap-6 overflow-hidden">
            {children}
          </div>
        </div>
      )}
    </aside>
  );
}
