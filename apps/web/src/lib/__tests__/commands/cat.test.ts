import { describe, it, expect } from "vitest";
import cat from "../../commands/cat.js";
import { seedFs } from "../../fs/seed.js";

const HOME = ["home", "notpelos"];
const ctx = {
  cwd: HOME,
  prevCwd: HOME as string[] | null,
  history: [],
  fs: seedFs,
};

describe("cat command", () => {
  it("outputs file content split by newlines", () => {
    const { lines } = cat.run(["about.md"], ctx);
    expect(lines.length).toBeGreaterThan(0);
    // Each line segment should have text content
    expect(lines[0]?.segments[0]?.text).toBeTruthy();
  });

  it("file content color is tn-text", () => {
    const { lines } = cat.run(["about.md"], ctx);
    expect(lines.every((l) => l.segments[0]?.color === "tn-text")).toBe(true);
  });

  it("returns error for non-existent file", () => {
    const { lines } = cat.run(["ghost.md"], ctx);
    expect(lines[0]?.kind).toBe("error");
    expect(lines[0]?.segments[0]?.text).toContain("No such file or directory");
  });

  it("returns error when target is a directory", () => {
    const { lines } = cat.run(["experience"], ctx);
    expect(lines[0]?.kind).toBe("error");
    expect(lines[0]?.segments[0]?.text).toContain("Is a directory");
  });

  it("returns error with no arguments", () => {
    const { lines } = cat.run([], ctx);
    expect(lines[0]?.kind).toBe("error");
  });

  it("works with absolute path", () => {
    const { lines } = cat.run(["/home/notpelos/about.md"], ctx);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]?.kind).not.toBe("error");
  });

  it("works with tilde path", () => {
    const { lines } = cat.run(["~/skills.json"], ctx);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]?.kind).not.toBe("error");
  });
});
