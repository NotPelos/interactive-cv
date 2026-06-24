import { describe, it, expect } from "vitest";
import cat from "../../commands/cat.js";
import { getMinimalSeed } from "../../fs/seed.js";

const HOME = ["home", "notpelos"];
const minFs = getMinimalSeed();
const ctx = {
  cwd: HOME,
  prevCwd: HOME as string[] | null,
  history: [],
  fs: minFs,
};

describe("cat command", () => {
  it("outputs file content (md renders to lines)", () => {
    const { lines } = cat.run(["about.md"], ctx);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]?.segments.length).toBeGreaterThan(0);
  });

  it("renders md: first line of about.md has text", () => {
    const { lines } = cat.run(["about.md"], ctx);
    const firstText = lines[0]?.segments[0]?.text;
    expect(firstText).toBeTruthy();
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

  it("json file renders as plain text (tn-text color)", () => {
    const { lines } = cat.run(["skills.json"], ctx);
    // JSON is not rendered as MD — all segments should have tn-text color
    expect(lines.every((l) => l.segments[0]?.color === "tn-text")).toBe(true);
  });
});
