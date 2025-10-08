/**
 * フルパスを表示用に整形するユーティリティ。
 * - 最後のディレクトリ名（カレントディレクトリ）は必ずフル表示する。
 * - それ以外のセグメントを段階的に短縮し、最大長を超えない形で返す。
 *
 * 短縮手順:
 * 1. 元のセグメント構成のまま長さチェック（先頭から順にセグメントを間引く）
 * 2. 途中セグメントを最大3文字へ短縮し、必要に応じて先頭側から間引く
 * 3. 途中セグメントを最大1文字へ短縮し、必要に応じて先頭側から間引く
 * 4. なお収まらない場合は、絶対パスのルート記号を落としてでも最後のセグメントを優先。
 * 5. それでも収まらない（最後のセグメント自体が長過ぎる）場合は末尾を優先して切り詰め、先頭に省略記号を付ける。
 *
 * @param path フルパス（Unix/Windows どちらのセパレータにも対応）
 * @param maxLength 返却する文字列の最大長
 */
export function formatPathForDisplay(path: string, maxLength: number): string {
  if (maxLength <= 0) {
    return "";
  }

  if (path.length === 0) {
    return path;
  }

  const separator = path.includes("\\") ? "\\" : "/";

  let normalizedPath = path;

  // 末尾のセパレータは不要なので除去（ルート「/」「C:\」などは除外）
  const isWindowsDriveRoot = /^[A-Za-z]:\\$/.test(normalizedPath);
  const isUnixRoot = normalizedPath === "/";

  if (!isWindowsDriveRoot && !isUnixRoot) {
    while (normalizedPath.length > 1 && normalizedPath.endsWith(separator)) {
      normalizedPath = normalizedPath.slice(0, -1);
    }
  }

  if (normalizedPath.length <= maxLength) {
    return normalizedPath;
  }

  const segments = normalizedPath.split(separator);
  if (segments.length === 0) {
    return normalizedPath.slice(-maxLength);
  }

  const lastSegment = segments.pop() ?? "";
  if (lastSegment.length === 0) {
    return normalizedPath.slice(0, maxLength);
  }

  const prefixSegments = segments;
  const hasReservedFirst =
    prefixSegments.length > 0 &&
    (prefixSegments[0] === "" || /^[A-Za-z]:$/.test(prefixSegments[0]));

  const buildCandidate = (limit: number): string => {
    const shortened = prefixSegments.map((segment, index) => {
      if (index === 0 && hasReservedFirst) {
        return segment;
      }

      if (segment.length <= limit) {
        return segment;
      }

      return segment.slice(0, limit);
    });

    return joinSegments(shortened);
  };

  const joinSegments = (prefix: string[]): string => {
    if (prefix.length === 0) {
      return lastSegment;
    }

    if (prefix.length === 1 && prefix[0] === "") {
      return `${separator}${lastSegment}`;
    }

    const prefixString = prefix.join(separator);
    return `${prefixString}${separator}${lastSegment}`;
  };

  const candidate3 = buildCandidate(3);
  if (candidate3.length <= maxLength) {
    return candidate3;
  }

  const candidate1 = buildCandidate(1);
  if (candidate1.length <= maxLength) {
    return candidate1;
  }

  // 最低限、最後のセグメントを表示し、可能なら省略記号＋セパレータを付与
  const suffix = lastSegment;
  const ellipsis = "…";

  if (suffix.length + 2 <= maxLength) {
    return `${ellipsis}${separator}${suffix}`;
  }

  if (suffix.length + 1 <= maxLength) {
    return `${ellipsis}${suffix}`;
  }

  if (maxLength === 1) {
    return suffix.slice(-1);
  }

  return `${ellipsis}${suffix.slice(suffix.length - (maxLength - 1))}`;
}
