import { describe, it, expect, beforeAll } from "vitest";
import help, { registry } from "../../commands/help.js";
import { commandRegistry } from "../../commands/index.js";
import { makeCtx } from "../helpers/ctx.js";

// Populate the help registry (mirrors what index.ts does at runtime).
beforeAll(() => {
  for (const [k, v] of commandRegistry.entries()) {
    registry.set(k, v);
  }
});

describe("help command — hidden filtering", () => {
  it("does not list sudo in help output", () => {
    const ctx = makeCtx({ lang: "en" });
    const { lines } = help.run([], ctx);
    const allText = lines.flatMap((l) => l.segments.map((s) => s.text)).join(" ");
    expect(allText).not.toContain("sudo");
  });

  it("does not list rm in help output", () => {
    const ctx = makeCtx({ lang: "en" });
    const { lines } = help.run([], ctx);
    const allText = lines.flatMap((l) => l.segments.map((s) => s.text)).join(" ");
    // "rm" can appear inside words like "recruiter" — match exact word boundary
    const words = allText.split(/\s+/);
    expect(words).not.toContain("rm");
  });

  it("does not list exit in help output", () => {
    const ctx = makeCtx({ lang: "en" });
    const { lines } = help.run([], ctx);
    const allText = lines.flatMap((l) => l.segments.map((s) => s.text)).join(" ");
    expect(allText).not.toContain("exit");
  });

  it("does not list vim in help output", () => {
    const ctx = makeCtx({ lang: "en" });
    const { lines } = help.run([], ctx);
    const allText = lines.flatMap((l) => l.segments.map((s) => s.text)).join(" ");
    expect(allText).not.toContain("vim");
  });

  it("does not list emacs in help output", () => {
    const ctx = makeCtx({ lang: "en" });
    const { lines } = help.run([], ctx);
    const allText = lines.flatMap((l) => l.segments.map((s) => s.text)).join(" ");
    expect(allText).not.toContain("emacs");
  });

  it("does not list hack in help output", () => {
    const ctx = makeCtx({ lang: "en" });
    const { lines } = help.run([], ctx);
    const allText = lines.flatMap((l) => l.segments.map((s) => s.text)).join(" ");
    expect(allText).not.toContain("hack");
  });

  it("does not list hello in help output", () => {
    const ctx = makeCtx({ lang: "en" });
    const { lines } = help.run([], ctx);
    const allText = lines.flatMap((l) => l.segments.map((s) => s.text)).join(" ");
    expect(allText).not.toContain("hello");
  });

  it("still lists public commands like help, ls, cat, ai", () => {
    const ctx = makeCtx({ lang: "en" });
    const { lines } = help.run([], ctx);
    const allText = lines.flatMap((l) => l.segments.map((s) => s.text)).join(" ");
    expect(allText).toContain("help");
    expect(allText).toContain("ls");
    expect(allText).toContain("cat");
    expect(allText).toContain("ai");
  });
});
