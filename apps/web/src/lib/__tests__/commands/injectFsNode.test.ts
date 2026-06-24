import { describe, it, expect } from "vitest";
import { getMinimalSeed } from "../../fs/seed.js";
import type { FsNode } from "../../fs/index.js";

// Extracted helper mirroring the one in Terminal.tsx so we can test it in isolation.
function injectFsNode(
  root: Record<string, FsNode>,
  pathSegments: string[],
  name: string,
  content: string
): Record<string, FsNode> {
  function cloneDir(
    children: Record<string, FsNode>,
    remaining: string[]
  ): Record<string, FsNode> {
    if (remaining.length === 0) {
      return {
        ...children,
        [name]: { type: "file", name, content } as FsNode,
      };
    }
    const seg = remaining[0]!;
    const rest = remaining.slice(1);
    // eslint-disable-next-line security/detect-object-injection
    const existing = children[seg];
    if (existing && existing.type === "directory") {
      return {
        ...children,
        [seg]: { ...existing, children: cloneDir(existing.children, rest) },
      };
    }
    return {
      ...children,
      [seg]: {
        type: "directory",
        name: seg,
        children: cloneDir({}, rest),
      } as FsNode,
    };
  }

  return cloneDir(root, pathSegments);
}

describe("injectFsNode", () => {
  it("injects repos.json under /var/log/github/ without mutating original", () => {
    const original = getMinimalSeed("es");
    const content = '[{"name":"test"}]';

    const updated = injectFsNode(original, ["var", "log", "github"], "repos.json", content);

    // Original is not mutated
    const originalVar = original["var"] as { type: "directory"; children: Record<string, FsNode> };
    const originalLog = originalVar.children["log"] as { type: "directory"; children: Record<string, FsNode> };
    const originalGithub = originalLog.children["github"] as { type: "directory"; children: Record<string, FsNode> };
    const originalFile = originalGithub.children["repos.json"] as { type: "file"; name: string; content: string };
    // Original should still have the placeholder content
    expect(originalFile.content).toBe("(no data yet — run 'repos' first)");

    // Updated tree has the new content
    const updatedVar = updated["var"] as { type: "directory"; children: Record<string, FsNode> };
    const updatedLog = updatedVar.children["log"] as { type: "directory"; children: Record<string, FsNode> };
    const updatedGithub = updatedLog.children["github"] as { type: "directory"; children: Record<string, FsNode> };
    const updatedFile = updatedGithub.children["repos.json"] as { type: "file"; name: string; content: string };

    expect(updatedFile.type).toBe("file");
    expect(updatedFile.name).toBe("repos.json");
    expect(updatedFile.content).toBe('[{"name":"test"}]');
  });

  it("creates intermediate directories on-the-fly when path does not exist", () => {
    const root: Record<string, FsNode> = {};
    const content = "data";

    const updated = injectFsNode(root, ["a", "b", "c"], "file.json", content);

    const a = updated["a"] as { type: "directory"; children: Record<string, FsNode> };
    expect(a.type).toBe("directory");
    const b = a.children["b"] as { type: "directory"; children: Record<string, FsNode> };
    expect(b.type).toBe("directory");
    const c = b.children["c"] as { type: "directory"; children: Record<string, FsNode> };
    expect(c.type).toBe("directory");
    const file = c.children["file.json"] as { type: "file"; name: string; content: string };
    expect(file.type).toBe("file");
    expect(file.content).toBe("data");
  });

  it("replaces existing file without mutating siblings", () => {
    const original = getMinimalSeed("es");
    const newContent = "new-data";

    const updated = injectFsNode(original, ["var", "log", "github"], "repos.json", newContent);

    // Sibling trees untouched — home still points to same reference in original
    expect(updated["home"]).toBeDefined();

    // The injected file has the new content
    const updatedVar = updated["var"] as { type: "directory"; children: Record<string, FsNode> };
    const github = (updatedVar.children["log"] as { type: "directory"; children: Record<string, FsNode> })
      .children["github"] as { type: "directory"; children: Record<string, FsNode> };
    const file = github.children["repos.json"] as { type: "file"; content: string };
    expect(file.content).toBe("new-data");
  });

  it("does not mutate the original root object reference", () => {
    const original = getMinimalSeed("es");
    const originalKeys = Object.keys(original).sort();

    injectFsNode(original, ["var", "log", "github"], "repos.json", "x");

    expect(Object.keys(original).sort()).toEqual(originalKeys);
  });
});
