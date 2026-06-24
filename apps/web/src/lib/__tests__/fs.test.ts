import { describe, it, expect } from "vitest";
import { resolvePath, getNode, formatPath } from "../fs/index.js";
import { seedFs } from "../fs/seed.js";

const HOME = ["home", "notpelos"];

describe("resolvePath", () => {
  it("resolves an absolute path", () => {
    expect(resolvePath("/home/notpelos", [])).toEqual(["home", "notpelos"]);
  });

  it("resolves a relative path from cwd", () => {
    expect(resolvePath("experience", HOME)).toEqual([
      "home",
      "notpelos",
      "experience",
    ]);
  });

  it("resolves .. correctly", () => {
    expect(resolvePath("..", HOME)).toEqual(["home"]);
  });

  it("resolves multiple .. hops", () => {
    expect(resolvePath("../../", HOME)).toEqual([]);
  });

  it("returns null when going above root", () => {
    expect(resolvePath("../../../", HOME)).toBeNull();
  });

  it("resolves ~ to home", () => {
    expect(resolvePath("~", [])).toEqual(["home", "notpelos"]);
  });

  it("resolves ~/experience to nested path", () => {
    expect(resolvePath("~/experience", [])).toEqual([
      "home",
      "notpelos",
      "experience",
    ]);
  });

  it("resolves . (current dir) as no-op", () => {
    expect(resolvePath(".", HOME)).toEqual(HOME);
  });

  // fix 11: edge cases
  it("resolves empty string to current cwd (treated as relative empty path)", () => {
    // empty string splits into [] after filter(Boolean) → returns cwd unchanged
    expect(resolvePath("", HOME)).toEqual(HOME);
  });

  it("resolves / to root (empty segments)", () => {
    expect(resolvePath("/", HOME)).toEqual([]);
  });

  it("resolves ///foo//bar ignoring redundant slashes", () => {
    // filter(Boolean) removes empty segments from split
    expect(resolvePath("///foo//bar", HOME)).toEqual(["foo", "bar"]);
  });

  it("resolves ~foo literally (not home expansion)", () => {
    // Only bare ~ or ~/... triggers home expansion; ~foo is a literal name
    expect(resolvePath("~foo", HOME)).toEqual([...HOME, "~foo"]);
  });
});

describe("getNode", () => {
  it("returns synthetic root for empty segments", () => {
    const node = getNode([], seedFs);
    expect(node).not.toBeNull();
    expect(node?.type).toBe("directory");
  });

  it("finds the home/notpelos directory", () => {
    const node = getNode(HOME, seedFs);
    expect(node).not.toBeNull();
    expect(node?.type).toBe("directory");
    expect(node?.name).toBe("notpelos");
  });

  it("finds about.md file", () => {
    const node = getNode([...HOME, "about.md"], seedFs);
    expect(node).not.toBeNull();
    expect(node?.type).toBe("file");
  });

  it("returns null for non-existent path", () => {
    const node = getNode([...HOME, "nonexistent.txt"], seedFs);
    expect(node).toBeNull();
  });

  it("returns null when traversing into a file", () => {
    const node = getNode([...HOME, "about.md", "child"], seedFs);
    expect(node).toBeNull();
  });
});

describe("formatPath", () => {
  it("formats home as ~", () => {
    expect(formatPath(HOME)).toBe("~");
  });

  it("formats subdirectory under home with ~/ prefix", () => {
    expect(formatPath([...HOME, "experience"])).toBe("~/experience");
  });

  it("formats non-home path as absolute", () => {
    expect(formatPath(["usr", "bin"])).toBe("/usr/bin");
  });

  it("formats root as /", () => {
    expect(formatPath([])).toBe("/");
  });
});
