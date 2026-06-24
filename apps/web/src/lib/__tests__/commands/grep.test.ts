import { describe, it, expect } from "vitest";
import grep from "../../commands/grep.js";
import { getMinimalSeed } from "../../fs/seed.js";
import type { FsNode } from "../../fs/index.js";

const HOME = ["home", "notpelos"];
const ctx = {
  cwd: HOME,
  prevCwd: null as string[] | null,
  history: [],
  fs: getMinimalSeed(),
};

// Builds a deeply nested filesystem (depth > MAX_DEPTH = 8) to trigger truncation in grep
function buildDeepFsWithContent(_depth: number): Record<string, FsNode> {
  function makeLevel(d: number): FsNode {
    if (d === 0) {
      return { type: "file", name: "leaf.md", content: () => "searchable content here" };
    }
    const name = `dir${d}`;
    return {
      type: "directory",
      name,
      children: {
        "leaf.md": { type: "file", name: "leaf.md", content: () => "searchable content here" },
        nested: makeLevel(d - 1),
      },
    };
  }

  return {
    home: {
      type: "directory",
      name: "home",
      children: {
        notpelos: {
          type: "directory",
          name: "notpelos",
          children: {
            deep: makeLevel(12), // 12 levels > MAX_DEPTH (8)
          },
        },
      },
    },
  };
}

const deepCtx = {
  cwd: HOME,
  prevCwd: null as string[] | null,
  history: [],
  fs: buildDeepFsWithContent(12),
};

describe("grep command", () => {
  it("finds pattern in a single file", () => {
    const { lines } = grep.run(["Java", "about.md"], ctx);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]?.kind).not.toBe("error");
  });

  it("highlights the match in tn-yellow", () => {
    const { lines } = grep.run(["Java", "about.md"], ctx);
    const matchLine = lines[0];
    const yellowSeg = matchLine?.segments.find((s) => s.color === "tn-yellow");
    expect(yellowSeg).toBeDefined();
  });

  it("returns no-results message when pattern not found", () => {
    const { lines } = grep.run(["ZZZNOTEXIST", "about.md"], ctx);
    expect(lines[0]?.segments[0]?.text).toContain("sin resultados");
  });

  it("searches recursively in a directory", () => {
    const { lines } = grep.run(["Developer", "experience"], ctx);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]?.kind).not.toBe("error");
  });

  it("directory results show file path in tn-magenta", () => {
    const { lines } = grep.run(["Developer", "experience"], ctx);
    const pathSeg = lines[0]?.segments.find((s) => s.color === "tn-magenta");
    expect(pathSeg).toBeDefined();
  });

  it("returns error without sufficient arguments", () => {
    const { lines } = grep.run(["onlypattern"], ctx);
    expect(lines[0]?.kind).toBe("error");
  });

  it("returns error for non-existent file", () => {
    const { lines } = grep.run(["pattern", "ghost.md"], ctx);
    expect(lines[0]?.kind).toBe("error");
    expect(lines[0]?.segments[0]?.text).toContain("No such file or directory");
  });

  it("truncates deep filesystem and shows warning in tn-yellow", () => {
    const { lines } = grep.run(["searchable", "deep"], deepCtx);
    const truncationLine = lines.find(
      (l) =>
        l.segments[0]?.color === "tn-yellow" &&
        l.segments[0]?.text.includes("truncada")
    );
    expect(truncationLine).toBeDefined();
  });
});
