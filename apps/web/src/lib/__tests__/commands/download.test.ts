import { describe, it, expect } from "vitest";
import download from "../../commands/download.js";
import { makeCtx } from "../helpers/ctx.js";

describe("download command", () => {
  it("wrong arg returns error (es)", () => {
    const ctx = makeCtx({ lang: "es" });
    const result = download.run(["cv.txt"], ctx);
    expect(result.lines[0]?.kind).toBe("error");
    expect(result.lines[0]?.segments[0]?.text).toContain("solo 'cv.pdf'");
    expect(result.effect).toBeUndefined();
  });

  it("wrong arg returns error (en)", () => {
    const ctx = makeCtx({ lang: "en" });
    const result = download.run(["cv.txt"], ctx);
    expect(result.lines[0]?.kind).toBe("error");
    expect(result.lines[0]?.segments[0]?.text).toContain("only 'cv.pdf'");
  });

  it("no arg returns error", () => {
    const ctx = makeCtx({ lang: "es" });
    const result = download.run([], ctx);
    expect(result.lines[0]?.kind).toBe("error");
  });

  it("returns downloadPdf effect with static /cv-es.pdf (es)", () => {
    const ctx = makeCtx({ lang: "es" });
    const result = download.run(["cv.pdf"], ctx);
    expect(result.effect).toBe("downloadPdf");
    if (result.effect !== "downloadPdf") return;
    expect(result.url).toBe("/cv-es.pdf");
    expect(result.fallbackUrl).toBe("/cv-es.pdf");
    expect(result.filename).toBe("notpelos-cv-es.pdf");
    expect(result.lines[0]?.segments[0]?.color).toBe("tn-yellow");
  });

  it("returns downloadPdf effect with static /cv-en.pdf (en)", () => {
    const ctx = makeCtx({ lang: "en" });
    const result = download.run(["cv.pdf"], ctx);
    expect(result.effect).toBe("downloadPdf");
    if (result.effect !== "downloadPdf") return;
    expect(result.url).toBe("/cv-en.pdf");
    expect(result.fallbackUrl).toBe("/cv-en.pdf");
    expect(result.filename).toBe("notpelos-cv-en.pdf");
  });

  it("url does not depend on ctx.endpoints — it's a static file", () => {
    const ctx = makeCtx({ lang: "es", endpoints: { api: "http://ignored", worker: "" } });
    const result = download.run(["cv.pdf"], ctx);
    expect(result.effect).toBe("downloadPdf");
    if (result.effect !== "downloadPdf") return;
    expect(result.url).toBe("/cv-es.pdf");
  });
});
