import { describe, it, expect } from "vitest";
import ls from "../../commands/ls.js";
import { getMinimalSeed } from "../../fs/seed.js";

const HOME = ["home", "notpelos"];
const ctx = {
  cwd: HOME,
  prevCwd: HOME as string[] | null,
  history: [],
  fs: getMinimalSeed(),
};

describe("ls command", () => {
  it("lists visible files in home dir without hidden entries", () => {
    const { lines } = ls.run([], ctx);
    const texts = lines.map((l) => l.segments[0]?.text ?? "");
    expect(texts).toContain("about.md");
    expect(texts).toContain("experience/");
    expect(texts).toContain("skills.json");
    // Hidden .secrets should NOT appear
    expect(texts).not.toContain(".secrets/");
  });

  it("lists an explicit path", () => {
    const { lines } = ls.run(["experience"], ctx);
    const texts = lines.map((l) => l.segments[0]?.text ?? "");
    // Minimal seed has real experience files
    expect(texts.length).toBeGreaterThan(0);
    expect(texts.some((t) => t.endsWith(".md"))).toBe(true);
  });

  it("returns error for non-existent path", () => {
    const { lines } = ls.run(["nonexistent"], ctx);
    expect(lines[0]?.kind).toBe("error");
    expect(lines[0]?.segments[0]?.text).toContain("No such file or directory");
  });

  it("directories have cyan color and trailing slash", () => {
    const { lines } = ls.run([], ctx);
    const dirs = lines.filter((l) => l.segments[0]?.text?.endsWith("/"));
    expect(dirs.every((l) => l.segments[0]?.color === "tn-cyan")).toBe(true);
  });

  it("files have blue color", () => {
    const { lines } = ls.run([], ctx);
    const files = lines.filter((l) => !l.segments[0]?.text?.endsWith("/"));
    expect(files.every((l) => l.segments[0]?.color === "tn-blue")).toBe(true);
  });
});
