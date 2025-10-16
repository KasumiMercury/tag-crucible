import { File, Folder, Link } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatFileSize } from "@/lib/format";
import type { FileInfo } from "@/types";

interface FileDetailsProps {
  fileInfo: FileInfo;
}

export function FileDetails({ fileInfo }: FileDetailsProps) {
  const fileType = fileInfo.is_symlink
    ? "Symlink"
    : fileInfo.is_directory
      ? "Directory"
      : "File";

  const TypeIcon = fileInfo.is_symlink
    ? Link
    : fileInfo.is_directory
      ? Folder
      : File;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <TypeIcon className="size-5 text-muted-foreground" aria-hidden />
        <h3 className="text-lg font-semibold">{fileType}</h3>
      </div>

      <div className="space-y-3">
        <div>
          <dt className="text-xs font-medium text-muted-foreground mb-1">
            Path
          </dt>
          <dd className="text-sm font-mono break-all bg-muted/40 rounded-md px-2 py-1">
            {fileInfo.path}
          </dd>
        </div>

        {!fileInfo.is_directory && (
          <div>
            <dt className="text-xs font-medium text-muted-foreground mb-1">
              Size
            </dt>
            <dd className="text-sm">{formatFileSize(fileInfo.size)}</dd>
          </div>
        )}

        <div>
          <dt className="text-xs font-medium text-muted-foreground mb-1">
            Modified
          </dt>
          <dd className="text-sm">{formatDateTime(fileInfo.modified)}</dd>
        </div>

        {fileInfo.own_tags.length > 0 && (
          <div>
            <dt className="text-xs font-medium text-muted-foreground mb-1">
              Tags
            </dt>
            <dd className="flex flex-wrap gap-1">
              {fileInfo.own_tags.map((tag) => (
                <Badge variant="default" key={tag}>
                  {tag}
                </Badge>
              ))}
            </dd>
          </div>
        )}

        {fileInfo.inherited_tags.length > 0 && (
          <div>
            <dt className="text-xs font-medium text-muted-foreground mb-1">
              Inherited Tags
            </dt>
            <dd className="flex flex-wrap gap-1">
              {fileInfo.inherited_tags.map((tag) => (
                <Badge variant="secondary" key={tag}>
                  {tag}
                </Badge>
              ))}
            </dd>
          </div>
        )}
      </div>
    </div>
  );
}
