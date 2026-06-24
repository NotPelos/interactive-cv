import { describe, it, expect } from "vitest";
import langCmd from "../../commands/lang.js";
import cat from "../../commands/cat.js";
import { makeCtx } from "../helpers/ctx.js";
import type { CommandResult } from "../../commands/types.js";

// Narrowing helper: accede a result.lang solo cuando effect === 'setLang'.
function asSetLangResult(r: CommandResult) {
  if (r.effect !== "setLang") {
    throw new Error(`Expected setLang effect, got: ${r.effect}`);
  }
  return r;
}

// Nota: los tests de detectLang/isValidLang viven en __tests__/detect.test.ts

describe("lang command", () => {
  // 1. No args — shows current language
  it("shows current language when called with no args (ES)", () => {
    const ctx = makeCtx({ lang: "es" });
    const { lines } = langCmd.run([], ctx);
    expect(lines[0]?.kind).not.toBe("error");
    expect(lines[0]?.segments[0]?.text).toContain("español");
  });

  it("shows current language when called with no args (EN)", () => {
    const ctx = makeCtx({ lang: "en" });
    const { lines } = langCmd.run([], ctx);
    expect(lines[0]?.kind).not.toBe("error");
    expect(lines[0]?.segments[0]?.text).toContain("english");
  });

  // 2. lang es — sets lang to es
  it("lang es returns setLang effect with lang=es", () => {
    const ctx = makeCtx({ lang: "en" });
    const result = asSetLangResult(langCmd.run(["es"], ctx));
    expect(result.effect).toBe("setLang");
    expect(result.lang).toBe("es");
    expect(result.lines[0]?.kind).not.toBe("error");
    expect(result.lines[0]?.segments[0]?.text).toContain("español");
  });

  // 3. lang en — sets lang to en
  it("lang en returns setLang effect with lang=en", () => {
    const ctx = makeCtx({ lang: "es" });
    const result = asSetLangResult(langCmd.run(["en"], ctx));
    expect(result.effect).toBe("setLang");
    expect(result.lang).toBe("en");
    expect(result.lines[0]?.kind).not.toBe("error");
    expect(result.lines[0]?.segments[0]?.text).toContain("english");
  });

  // 4. Unsupported lang — error
  it("unsupported lang returns error", () => {
    const ctx = makeCtx({ lang: "es" });
    const result = langCmd.run(["fr"], ctx);
    expect(result.lines[0]?.kind).toBe("error");
    expect(result.lines[0]?.segments[0]?.text).toContain("fr");
    expect(result.effect).toBeUndefined();
  });

  it("unsupported lang error message in EN context", () => {
    const ctx = makeCtx({ lang: "en" });
    const result = langCmd.run(["xx"], ctx);
    expect(result.lines[0]?.kind).toBe("error");
    expect(result.lines[0]?.segments[0]?.text).toContain("xx");
    expect(result.lines[0]?.segments[0]?.text).toContain("try: es | en");
  });

  it("lang es in ES context outputs español confirmation", () => {
    const ctx = makeCtx({ lang: "es" });
    const result = langCmd.run(["es"], ctx);
    expect(result.lines[0]?.segments[0]?.text).toBe("idioma establecido: español");
  });

  it("lang en in EN context outputs english confirmation", () => {
    const ctx = makeCtx({ lang: "en" });
    const result = langCmd.run(["en"], ctx);
    expect(result.lines[0]?.segments[0]?.text).toBe("language set to english");
  });

  // 5. lang sin args muestra endónimo
  it("lang sin args en ES muestra 'idioma actual: español'", () => {
    const ctx = makeCtx({ lang: "es" });
    const { lines } = langCmd.run([], ctx);
    expect(lines[0]?.segments[0]?.text).toBe("idioma actual: español");
  });

  it("lang sin args en EN muestra 'current language: english'", () => {
    const ctx = makeCtx({ lang: "en" });
    const { lines } = langCmd.run([], ctx);
    expect(lines[0]?.segments[0]?.text).toBe("current language: english");
  });
});

// ---------------------------------------------------------------------------
// FS swap tests — verify getMinimalSeed returns language-specific content
// ---------------------------------------------------------------------------
describe("FS swap (minimal seed by lang)", () => {
  it("ES seed about.md contains Spanish content", () => {
    const ctx = makeCtx({ lang: "es" });
    const aboutNode = (ctx.fs["home"] as { type: "directory"; children: Record<string, unknown> })
      ?.children?.["notpelos"] as { type: "directory"; children: Record<string, { content: () => string }> } | undefined;
    const content = (aboutNode?.children?.["about.md"]?.content?.() ?? "").toLowerCase();
    expect(content).toContain("backend");
    expect(content).toContain("años");
  });

  it("EN seed about.md contains English content", () => {
    const ctx = makeCtx({ lang: "en" });
    const aboutNode = (ctx.fs["home"] as { type: "directory"; children: Record<string, unknown> })
      ?.children?.["notpelos"] as { type: "directory"; children: Record<string, { content: () => string }> } | undefined;
    const content = (aboutNode?.children?.["about.md"]?.content?.() ?? "").toLowerCase();
    expect(content).toContain("backend");
    expect(content).toContain("years");
  });
});

// ---------------------------------------------------------------------------
// i18n message translation test
// ---------------------------------------------------------------------------
describe("i18n message translation", () => {
  it("cat noexiste in EN returns EN error message", () => {
    const ctx = makeCtx({ lang: "en" });
    const { lines } = cat.run(["noexiste.md"], ctx);
    expect(lines[0]?.kind).toBe("error");
    const text = lines[0]?.segments[0]?.text ?? "";
    expect(text).toContain("No such file or directory");
    expect(text).toContain("cat:");
    expect(text).toContain("noexiste.md");
  });
});
