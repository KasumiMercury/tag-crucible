import { describe, expect, it } from "vitest";

import { formatPathForDisplay } from "@/features/explore/utils/formatPathForDisplay";

describe("formatPathForDisplay", () => {
  describe("Unix paths", () => {
    it("returns full path when it is shorter than maxLength", () => {
      const result = formatPathForDisplay("/Users/example/projects", 30);
      expect(result).toBe("/Users/example/projects");
    });

    it("returns full path when it equals maxLength", () => {
      const result = formatPathForDisplay("/Users/example/projects", 24);
      expect(result).toBe("/Users/example/projects");
    });

    it("shortens intermediate segments to 3 chars while keeping last segment full", () => {
      const result = formatPathForDisplay("/Users/example/projects/subdir", 25);
      expect(result).toBe("/Use/exa/pro/subdir");
    });

    it("shortens intermediate segments to 1 char when 3-char shortening is not enough", () => {
      const result = formatPathForDisplay("/Users/example/projects/subdir", 17);
      expect(result).toBe("/U/e/p/subdir");
    });

    it("falls back to ellipsis with separator when still too long", () => {
      const result = formatPathForDisplay("/Users/example/projects/subdir", 12);
      expect(result).toBe("…/subdir");
    });

    it("handles root directory", () => {
      const result = formatPathForDisplay("/", 10);
      expect(result).toBe("/");
    });

    it("handles single level path", () => {
      const result = formatPathForDisplay("/root", 10);
      expect(result).toBe("/root");
    });

    it("handles deeply nested paths", () => {
      const result = formatPathForDisplay(
        "/Users/example/projects/frontend/components/common/Button.tsx",
        27,
      );
      expect(result).toBe("/U/e/p/f/c/c/Button.tsx");
    });
  });

  describe("Windows paths", () => {
    it("returns full path when it is shorter than maxLength", () => {
      const result = formatPathForDisplay("C:\\Users\\example\\projects", 30);
      expect(result).toBe("C:\\Users\\example\\projects");
    });

    it("shortens intermediate segments to 3 chars while keeping last segment full", () => {
      const result = formatPathForDisplay(
        "C:\\Users\\example\\projects\\subdir",
        27,
      );
      expect(result).toBe("C:\\Use\\exa\\pro\\subdir");
    });

    it("shortens intermediate segments to 1 char when 3-char shortening is not enough", () => {
      const result = formatPathForDisplay(
        "C:\\Users\\example\\projects\\subdir",
        19,
      );
      expect(result).toBe("C:\\U\\e\\p\\subdir");
    });

    it("falls back to ellipsis with separator when still too long", () => {
      const result = formatPathForDisplay(
        "C:\\Users\\example\\projects\\subdir",
        12,
      );
      expect(result).toBe("…\\subdir");
    });

    it("handles drive root", () => {
      const result = formatPathForDisplay("C:\\", 10);
      expect(result).toBe("C:\\");
    });

    it("handles single level path", () => {
      const result = formatPathForDisplay("C:\\Windows", 15);
      expect(result).toBe("C:\\Windows");
    });
  });

  describe("edge cases", () => {
    it("handles empty path", () => {
      const result = formatPathForDisplay("", 10);
      expect(result).toBe("");
    });

    it("handles very short maxLength", () => {
      const result = formatPathForDisplay("/Users/example/projects", 5);
      expect(result).toBe("…ects");
    });

    it("handles path with no separators", () => {
      const result = formatPathForDisplay("filename.txt", 20);
      expect(result).toBe("filename.txt");
    });
  });
});
