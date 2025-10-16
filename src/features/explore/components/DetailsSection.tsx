import { FileDetails } from "@/components/file-details";
import type { DirectoryNode } from "@/types";

interface DetailsSectionProps {
  node: DirectoryNode | null;
  title?: string;
}

export function DetailsSection({
  node,
  title = "Details",
}: DetailsSectionProps) {
  if (!node) {
    return (
      <div className="flex h-full flex-col gap-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">No item selected.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="flex-1 overflow-y-auto">
        <FileDetails node={node} />
      </div>
    </div>
  );
}
