import { describe, it, expect } from "vitest";
import find from "../../commands/find.js";
import { getMinimalSeed } from "../../fs/seed.js";
import type { FsNode } from "../../fs/index.js";

const HOME = ["home", "notpelos"];
const ctx = {
  cwd: HOME,
  prevCwd: null as string[] | null,
  history: [],
  fs: getMinimalSeed(),
};

// Builds a deeply nested filesystem (depth > MAX_DEPTH = 8) to trigger truncation
function buildDeepFs(depth: number): Record<string, FsNode> {
  function makeLevel(d: number): FsNode {
    if (d === 0) {
      return { type: "file", name: "leaf.md", content: () => "leaf" };
    }
    const name = `dir${d}`;
    return {
      type: "directory",
      name,
      children: {
        "leaf.md": { type: "file", name: "leaf.md", content: () => "leaf" },
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
            deep: makeLevel(depth),
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
  fs: buildDeepFs(12), // 12 levels > MAX_DEPTH (8)
};

describe("find command", () => {
  it("finds all .md files with wildcard *.md", () => {
    const { lines } = find.run(["*.md"], ctx);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((l) => l.segments[0]?.text.endsWith(".md"))).toBe(true);
  });

  it("find *.md includes about.md", () => {
    const { lines } = find.run(["*.md"], ctx);
    const texts = lines.map((l) => l.segments[0]?.text ?? "");
    expect(texts.some((t) => t === "about.md" || t.endsWith("about.md"))).toBe(true);
  });

  it("find *.md includes experience entries", () => {
    const { lines } = find.run(["*.md"], ctx);
    const texts = lines.map((l) => l.segments[0]?.text ?? "");
    expect(texts.some((t) => t.includes("experience"))).toBe(true);
  });

  it("substring match without wildcard", () => {
    const { lines } = find.run(["experience"], ctx);
    // experience is a directory, not a file — find finds files inside it
    // OR if pattern matches dir entries within — in our impl we match file names
    // The minimal seed has files inside experience/ with 'softtek' and 'aubay'
    // find 'experience' as substring should not match directory names
    // (we only push files to results)
    expect(lines[0]?.kind).not.toBe("error");
  });

  it("returns no-results message for unmatched pattern", () => {
    const { lines } = find.run(["*.xyz"], ctx);
    expect(lines[0]?.segments[0]?.text).toContain("sin resultados");
  });

  it("returns error without arguments", () => {
    const { lines } = find.run([], ctx);
    expect(lines[0]?.kind).toBe("error");
  });

  it("results are blue colored", () => {
    const { lines } = find.run(["*.md"], ctx);
    expect(lines.every((l) => l.segments[0]?.color === "tn-blue")).toBe(true);
  });

  it("truncates deep filesystem and shows warning in tn-yellow", () => {
    const { lines } = find.run(["*.md"], deepCtx);
    const truncationLine = lines.find(
      (l) =>
        l.segments[0]?.color === "tn-yellow" &&
        l.segments[0]?.text.includes("truncada")
    );
    expect(truncationLine).toBeDefined();
  });
});
