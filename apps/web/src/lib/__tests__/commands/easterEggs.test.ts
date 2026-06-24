import { describe, it, expect } from "vitest";
import { sudo, rm, exit, vim, emacs, hack, hello } from "../../commands/eastereggs.js";
import { makeCtx } from "../helpers/ctx.js";

// Helper: get all text from lines
function allText(lines: ReturnType<typeof sudo.run>["lines"]): string {
  return lines.flatMap((l) => l.segments.map((s) => s.text)).join(" ");
}

describe("sudo easter egg", () => {
  it("returns message in ES", () => {
    const ctx = makeCtx({ lang: "es" });
    const { lines } = sudo.run([], ctx);
    expect(allText(lines)).toContain("café");
    expect(allText(lines)).toContain("root");
  });

  it("returns message in EN", () => {
    const ctx = makeCtx({ lang: "en" });
    const { lines } = sudo.run([], ctx);
    expect(allText(lines)).toContain("root");
    expect(allText(lines)).toContain("coffee");
  });

  it("accepts any args and returns same message", () => {
    const ctx = makeCtx({ lang: "en" });
    const r1 = sudo.run(["make-me-a-sandwich"], ctx);
    const r2 = sudo.run(["apt", "install", "life"], ctx);
    expect(allText(r1.lines)).toBe(allText(r2.lines));
  });

  it("response is colored tn-magenta", () => {
    const { lines } = sudo.run([], makeCtx());
    expect(lines[0]?.segments[0]?.color).toBe("tn-magenta");
  });
});

describe("rm easter egg", () => {
  it("contains multiple destruction lines in ES", () => {
    const ctx = makeCtx({ lang: "es" });
    const { lines } = rm.run(["-rf", "/"], ctx);
    expect(lines.length).toBeGreaterThan(3);
    const text = allText(lines);
    expect(text).toContain("removing");
  });

  it("final line contains humour message (ES)", () => {
    const ctx = makeCtx({ lang: "es" });
    const { lines } = rm.run(["-rf", "/"], ctx);
    const last = lines[lines.length - 1];
    expect(last?.segments[0]?.text).toContain("CV");
  });

  it("final line contains humour message (EN)", () => {
    const ctx = makeCtx({ lang: "en" });
    const { lines } = rm.run(["-rf", "/"], ctx);
    const last = lines[lines.length - 1];
    expect(last?.segments[0]?.text).toContain("CV");
  });
});

describe("exit easter egg", () => {
  it("returns 'No puedes huir' in ES", () => {
    const ctx = makeCtx({ lang: "es" });
    const { lines } = exit.run([], ctx);
    expect(allText(lines)).toContain("No puedes huir");
  });

  it("returns escape message in EN", () => {
    const ctx = makeCtx({ lang: "en" });
    const { lines } = exit.run([], ctx);
    expect(allText(lines)).toContain("escape");
  });
});

describe("vim easter egg", () => {
  it("contains browser/terminal reference (ES)", () => {
    const ctx = makeCtx({ lang: "es" });
    const { lines } = vim.run([], ctx);
    expect(allText(lines)).toContain("navegador");
  });

  it("contains browser/terminal reference (EN)", () => {
    const ctx = makeCtx({ lang: "en" });
    const { lines } = vim.run([], ctx);
    expect(allText(lines)).toContain("browser");
  });
});

describe("emacs easter egg", () => {
  it("returns beliefs message (ES)", () => {
    const ctx = makeCtx({ lang: "es" });
    const { lines } = emacs.run([], ctx);
    expect(allText(lines)).toContain("creencias");
  });

  it("returns beliefs message (EN)", () => {
    const ctx = makeCtx({ lang: "en" });
    const { lines } = emacs.run([], ctx);
    expect(allText(lines)).toContain("beliefs");
  });
});

describe("hack easter egg", () => {
  it("says already inside (ES)", () => {
    const ctx = makeCtx({ lang: "es" });
    const { lines } = hack.run([], ctx);
    expect(allText(lines)).toContain("dentro");
  });

  it("says already inside (EN)", () => {
    const ctx = makeCtx({ lang: "en" });
    const { lines } = hack.run([], ctx);
    expect(allText(lines)).toContain("already");
  });
});

describe("hello easter egg", () => {
  it("greets in ES", () => {
    const ctx = makeCtx({ lang: "es" });
    const { lines } = hello.run([], ctx);
    expect(allText(lines)).toContain("Hola");
  });

  it("greets in EN", () => {
    const ctx = makeCtx({ lang: "en" });
    const { lines } = hello.run([], ctx);
    expect(allText(lines)).toContain("Hi");
  });
});

describe("hidden flag on easter eggs", () => {
  it("sudo is hidden", () => {
    expect(sudo.hidden).toBe(true);
  });

  it("rm is hidden", () => {
    expect(rm.hidden).toBe(true);
  });

  it("exit is hidden", () => {
    expect(exit.hidden).toBe(true);
  });

  it("vim is hidden", () => {
    expect(vim.hidden).toBe(true);
  });

  it("emacs is hidden", () => {
    expect(emacs.hidden).toBe(true);
  });

  it("hack is hidden", () => {
    expect(hack.hidden).toBe(true);
  });

  it("hello is hidden", () => {
    expect(hello.hidden).toBe(true);
  });
});
