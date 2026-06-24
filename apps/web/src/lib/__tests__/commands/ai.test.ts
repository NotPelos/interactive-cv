import { describe, it, expect } from "vitest";
import ai, { matchScript } from "../../commands/ai.js";
import { makeCtx } from "../helpers/ctx.js";

describe("matchScript (ai keyword matcher)", () => {
  it("matches 'contratar' trigger (ES)", () => {
    const result = matchScript("quiero contratar a alguien", "es");
    expect(result).toContain("Contratarme");
  });

  it("matches 'hire' trigger (EN)", () => {
    const result = matchScript("I want to hire you", "en");
    expect(result).toContain("Hire me");
  });

  it("matches 'java' trigger (ES)", () => {
    const result = matchScript("háblame de java", "es");
    expect(result).toContain("Pan de cada día");
  });

  it("matches 'spring boot' trigger (ES) — multi-word trigger", () => {
    const result = matchScript("qué sabes de spring boot", "es");
    expect(result).toContain("Pan de cada día");
  });

  it("matches 'remoto' trigger (ES)", () => {
    const result = matchScript("trabajas en remoto", "es");
    expect(result).toContain("Sí");
  });

  it("normalises accents — 'café' matches 'cafe'", () => {
    const result = matchScript("te gusta el cafe", "es");
    expect(result).toContain("Combustible primario");
  });

  it("normalises input accents — 'café' in input matches 'cafe' trigger", () => {
    const result = matchScript("te gusta el café", "es");
    expect(result).toContain("Combustible primario");
  });

  it("is case-insensitive — 'JAVA' matches 'java'", () => {
    const result = matchScript("JAVA es tu lenguaje principal", "es");
    expect(result).toContain("Pan de cada día");
  });

  it("returns fallback when nothing matches (ES)", () => {
    const result = matchScript("xkcd webcomic strip 327", "es");
    expect(result).toContain("fake, no mágico");
  });

  it("returns fallback when nothing matches (EN)", () => {
    const result = matchScript("xkcd webcomic strip 327", "en");
    expect(result).toContain("I'm fake");
  });

  it("matches 'ai' trigger — meta-answer about itself (ES)", () => {
    const result = matchScript("que es esto de ai y llm", "es");
    expect(result).toContain("guion con regex");
  });

  it("matches 'matrix' trigger (EN)", () => {
    const result = matchScript("show me the matrix", "en");
    expect(result).toContain("Konami");
  });

  it("matches 'python' exactly (EN)", () => {
    const result = matchScript("do you know python", "en");
    expect(result).toContain("scripts and bots");
  });

  it("matches 'gta' trigger (ES response mentions GTA RP)", () => {
    const result = matchScript("gta rp scripts", "es");
    expect(result).toContain("GTA RP");
  });

  it("matches 'fivem' trigger (EN response mentions GTA RP)", () => {
    const result = matchScript("fivem server scripts", "en");
    expect(result).toContain("GTA RP");
  });

  it("matches 'senior' trigger (EN)", () => {
    const result = matchScript("what is your seniority", "en");
    expect(result).toContain("Mid-Senior");
  });
});

describe("ai command", () => {
  it("returns guide message when called with no args (ES)", () => {
    const ctx = makeCtx({ lang: "es" });
    const { lines } = ai.run([], ctx);
    expect(lines[0]?.kind).not.toBe("error");
    expect(lines[0]?.segments[0]?.color).toBe("tn-yellow");
    expect(lines[0]?.segments[0]?.text).toContain("ai:");
  });

  it("returns guide message when called with no args (EN)", () => {
    const ctx = makeCtx({ lang: "en" });
    const { lines } = ai.run([], ctx);
    expect(lines[0]?.segments[0]?.text).toContain("ai:");
  });

  it("returns answer with → prefix in magenta (ES)", () => {
    const ctx = makeCtx({ lang: "es" });
    const { lines } = ai.run(["contratar"], ctx);
    expect(lines[0]?.segments[0]?.text).toBe("→ ");
    expect(lines[0]?.segments[0]?.color).toBe("tn-magenta");
    expect(lines[0]?.segments[1]?.color).toBe("tn-text");
  });

  it("returns answer with → prefix in magenta (EN)", () => {
    const ctx = makeCtx({ lang: "en" });
    const { lines } = ai.run(["hire"], ctx);
    expect(lines[0]?.segments[0]?.text).toBe("→ ");
    expect(lines[0]?.segments[1]?.text).toContain("Hire me");
  });

  it("joins multiple args into a single query", () => {
    const ctx = makeCtx({ lang: "es" });
    const { lines } = ai.run(["hablar", "de", "java"], ctx);
    expect(lines[0]?.segments[1]?.text).toContain("Pan de cada día");
  });

  it("returns fallback for unrecognised query", () => {
    const ctx = makeCtx({ lang: "es" });
    const { lines } = ai.run(["xkcd", "327"], ctx);
    expect(lines[0]?.segments[1]?.text).toContain("fake, no mágico");
  });

  it("has brief in both langs", () => {
    expect(ai.brief.es).toBeTruthy();
    expect(ai.brief.en).toBeTruthy();
  });
});
