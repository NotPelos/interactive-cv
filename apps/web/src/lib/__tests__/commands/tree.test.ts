import { describe, it, expect } from "vitest";
import tree from "../../commands/tree.js";
import { makeCtx } from "../helpers/ctx.js";

const HOME = ["home", "notpelos"];
const ctx = makeCtx({ cwd: HOME });

describe("tree command", () => {
  it("renders root directory label", () => {
    const { lines } = tree.run([], ctx);
    const firstLine = lines[0];
    expect(firstLine?.segments[0]?.text).toContain("~");
  });

  it("contains experience/ branch in output", () => {
    const { lines } = tree.run([], ctx);
    const texts = lines.flatMap((l) => l.segments.map((s) => s.text));
    expect(texts.some((t) => t.includes("experience"))).toBe(true);
  });

  it("directories have cyan color", () => {
    const { lines } = tree.run([], ctx);
    const dirLines = lines.filter((l) =>
      l.segments.some((s) => s.text.endsWith("/") && s.color === "tn-cyan")
    );
    expect(dirLines.length).toBeGreaterThan(0);
  });

  it("files have blue color", () => {
    const { lines } = tree.run([], ctx);
    const fileLines = lines.filter((l) =>
      l.segments.some((s) => s.color === "tn-blue" && !s.text.endsWith("/"))
    );
    expect(fileLines.length).toBeGreaterThan(0);
  });

  it("returns error for non-existent path", () => {
    const { lines } = tree.run(["nonexistent"], ctx);
    expect(lines[0]?.kind).toBe("error");
    expect(lines[0]?.segments[0]?.text).toContain("No such file or directory");
  });

  it("works with explicit path", () => {
    const { lines } = tree.run(["experience"], ctx);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]?.kind).not.toBe("error");
  });
});
