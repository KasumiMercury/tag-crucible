import { FileDetails } from "@/components/file-details";
import type { FileInfo } from "@/types";

interface DetailsSectionProps {
  fileInfo: FileInfo | null;
  title?: string;
}

export function DetailsSection({
  fileInfo,
  title = "Details",
}: DetailsSectionProps) {
  if (!fileInfo) {
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
        <FileDetails fileInfo={fileInfo} />
      </div>
    </div>
  );
}
