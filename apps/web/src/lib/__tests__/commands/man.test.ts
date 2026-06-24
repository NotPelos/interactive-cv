import { describe, it, expect, beforeAll } from "vitest";
import man, { registry as manRegistry } from "../../commands/man.js";
import cat from "../../commands/cat.js";
import ls from "../../commands/ls.js";
import { makeCtx } from "../helpers/ctx.js";

const HOME = ["home", "notpelos"];
const ctx = makeCtx({ cwd: HOME });
const ctxEn = makeCtx({ cwd: HOME, lang: "en" });

beforeAll(() => {
  manRegistry.set("cat", cat);
  manRegistry.set("ls", ls);
  manRegistry.set("man", man);
});

describe("man command", () => {
  it("returns manual for known command", () => {
    const { lines } = man.run(["cat"], ctx);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0]?.kind).not.toBe("error");
  });

  it("header contains command name in tn-magenta", () => {
    const { lines } = man.run(["cat"], ctx);
    const headerSeg = lines[0]?.segments.find((s) => s.color === "tn-magenta");
    expect(headerSeg?.text).toBe("cat");
  });

  it("separator line uses tn-border", () => {
    const { lines } = man.run(["cat"], ctx);
    const sepLine = lines[1];
    expect(sepLine?.segments[0]?.color).toBe("tn-border");
  });

  it("returns error for unknown command", () => {
    const { lines } = man.run(["fakecommand"], ctx);
    expect(lines[0]?.kind).toBe("error");
    expect(lines[0]?.segments[0]?.text).toContain("fakecommand");
  });

  it("returns error with no arguments", () => {
    const { lines } = man.run([], ctx);
    expect(lines[0]?.kind).toBe("error");
  });

  it("returns manual paragraphs for ls", () => {
    const { lines } = man.run(["ls"], ctx);
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });

  it("manual content has tn-text color", () => {
    const { lines } = man.run(["cat"], ctx);
    const textLines = lines.slice(2); // skip header and separator
    expect(textLines.every((l) => l.segments[0]?.color === "tn-text")).toBe(true);
  });

  it("brief in ES for ES context", () => {
    const { lines } = man.run(["cat"], ctx);
    const headerBriefSeg = lines[0]?.segments.find(
      (s) => s.color === "tn-magenta" && s.text !== "cat"
    );
    expect(headerBriefSeg?.text).toBe("Muestra el contenido de un archivo");
  });

  it("brief in EN for EN context", () => {
    const { lines } = man.run(["cat"], ctxEn);
    const headerBriefSeg = lines[0]?.segments.find(
      (s) => s.color === "tn-magenta" && s.text !== "cat"
    );
    expect(headerBriefSeg?.text).toBe("Show file contents");
  });

  it("error message in EN for EN context", () => {
    const { lines } = man.run([], ctxEn);
    expect(lines[0]?.kind).toBe("error");
    expect(lines[0]?.segments[0]?.text).toBe("man: what manual page do you want?");
  });
});
