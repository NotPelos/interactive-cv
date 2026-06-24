import { describe, it, expect } from "vitest";
import whoami from "../../commands/whoami.js";
import { makeCtx } from "../helpers/ctx.js";

describe("whoami command — no bot detection (userAgent undefined)", () => {
  it("returns 'visitante' in ES", () => {
    const ctx = makeCtx({ lang: "es" });
    const { lines } = whoami.run([], ctx);
    expect(lines[0]?.segments[0]?.text).toBe("visitante");
    expect(lines[0]?.segments[0]?.color).toBe("tn-magenta");
  });

  it("returns 'visitor' in EN", () => {
    const ctx = makeCtx({ lang: "en" });
    const { lines } = whoami.run([], ctx);
    expect(lines[0]?.segments[0]?.text).toBe("visitor");
    expect(lines[0]?.segments[0]?.color).toBe("tn-magenta");
  });
});

describe("whoami command — bot detection via injected userAgent", () => {
  it("returns bot message for Googlebot in ES", () => {
    const ctx = {
      ...makeCtx({ lang: "es" }),
      userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    };
    const { lines } = whoami.run([], ctx);
    const text = lines[0]?.segments[0]?.text ?? "";
    expect(text).toContain("googlebot");
    expect(text).toContain("humano");
  });

  it("returns bot message for Googlebot in EN", () => {
    const ctx = {
      ...makeCtx({ lang: "en" }),
      userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    };
    const { lines } = whoami.run([], ctx);
    const text = lines[0]?.segments[0]?.text ?? "";
    expect(text).toContain("googlebot");
    expect(text).toContain("human");
  });

  it("returns bot message for GPTBot in EN", () => {
    const ctx = {
      ...makeCtx({ lang: "en" }),
      userAgent: "GPTBot/1.0 (+https://openai.com/gptbot)",
    };
    const { lines } = whoami.run([], ctx);
    const text = lines[0]?.segments[0]?.text ?? "";
    expect(text).toContain("gptbot");
    expect(text).toContain("human");
  });

  it("returns 'visitor' for normal browser even with userAgent injected", () => {
    const ctx = {
      ...makeCtx({ lang: "en" }),
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    };
    const { lines } = whoami.run([], ctx);
    expect(lines[0]?.segments[0]?.text).toBe("visitor");
  });

  it("returns 'visitante' for normal browser in ES", () => {
    const ctx = {
      ...makeCtx({ lang: "es" }),
      userAgent: "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0",
    };
    const { lines } = whoami.run([], ctx);
    expect(lines[0]?.segments[0]?.text).toBe("visitante");
  });

  it("ignores args", () => {
    const ctx = makeCtx({ lang: "es" });
    const { lines } = whoami.run(["--verbose"], ctx);
    expect(lines.length).toBeGreaterThan(0);
  });
});
