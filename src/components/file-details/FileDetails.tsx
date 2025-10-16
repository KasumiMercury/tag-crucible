import { File, Folder, Link } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ChildList } from "./ChildList";
import { formatDateTime, formatFileSize } from "@/lib/format";
import type { DirectoryNode } from "@/types";

interface FileDetailsProps {
    node: DirectoryNode;
}

export function FileDetails({ node }: FileDetailsProps) {
    const { info } = node;
    const fileType = info.is_symlink
        ? "Symlink"
        : info.is_directory
          ? "Directory"
          : "File";

    const TypeIcon = info.is_symlink ? Link : info.is_directory ? Folder : File;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <TypeIcon
                    className="size-5 text-muted-foreground"
                    aria-hidden
                />
                <h3 className="text-lg font-semibold">{fileType}</h3>
            </div>

            <div className="space-y-3">
                <div>
                    <dt className="text-xs font-medium text-muted-foreground mb-1">
                        Path
                    </dt>
                    <dd className="text-sm font-mono break-all bg-muted/40 rounded-md px-2 py-1">
                        {info.path}
                    </dd>
                </div>

                {!info.is_directory && (
                    <div className="flex flex-col">
                        <div>
                            <dt className="text-xs font-medium text-muted-foreground mb-1">
                                Size
                            </dt>
                            <dd className="text-sm">
                                {formatFileSize(info.size)}
                            </dd>
                        </div>
                    </div>
                )}

                <div>
                    <dt className="text-xs font-medium text-muted-foreground mb-1">
                        Modified
                    </dt>
                    <dd className="text-sm">{formatDateTime(info.modified)}</dd>
                </div>

                {info.own_tags.length > 0 && (
                    <div>
                        <dt className="text-xs font-medium text-muted-foreground mb-1">
                            Tags
                        </dt>
                        <dd className="flex flex-wrap gap-1">
                            {info.own_tags.map((tag) => (
                                <Badge variant="default" key={tag}>
                                    {tag}
                                </Badge>
                            ))}
                        </dd>
                    </div>
                )}

                {info.inherited_tags.length > 0 && (
                    <div>
                        <dt className="text-xs font-medium text-muted-foreground mb-1">
                            Inherited Tags
                        </dt>
                        <dd className="flex flex-wrap gap-1">
                            {info.inherited_tags.map((tag) => (
                                <Badge variant="secondary" key={tag}>
                                    {tag}
                                </Badge>
                            ))}
                        </dd>
                    </div>
                )}

                {info.is_directory && <ChildList items={node.children} />}
            </div>
        </div>
    );
}
