import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import download from "../../commands/download.js";
import { makeCtx } from "../helpers/ctx.js";

const API_URL = "http://localhost:8080";

function makeCtxWithApi(lang: "es" | "en" = "es") {
  return makeCtx({ lang, endpoints: { api: API_URL, worker: "" } });
}

describe("download command", () => {
  it("wrong arg returns error (es)", () => {
    const ctx = makeCtxWithApi("es");
    const result = download.run(["cv.txt"], ctx);
    expect(result.lines[0]?.kind).toBe("error");
    expect(result.lines[0]?.segments[0]?.text).toContain("solo 'cv.pdf'");
    expect(result.effect).toBeUndefined();
  });

  it("wrong arg returns error (en)", () => {
    const ctx = makeCtxWithApi("en");
    const result = download.run(["cv.txt"], ctx);
    expect(result.lines[0]?.kind).toBe("error");
    expect(result.lines[0]?.segments[0]?.text).toContain("only 'cv.pdf'");
  });

  it("no arg returns error", () => {
    const ctx = makeCtxWithApi();
    const result = download.run([], ctx);
    expect(result.lines[0]?.kind).toBe("error");
  });

  it("happy path returns downloadPdf effect with correct URL (es)", () => {
    const ctx = makeCtxWithApi("es");
    const result = download.run(["cv.pdf"], ctx);
    expect(result.effect).toBe("downloadPdf");
    if (result.effect !== "downloadPdf") return;
    expect(result.url).toBe(`${API_URL}/api/cv/pdf?lang=es`);
    expect(result.fallbackUrl).toBe("/cv-static-es.pdf");
    expect(result.filename).toBe("notpelos-cv-es.pdf");
    expect(result.lines[0]?.segments[0]?.color).toBe("tn-yellow");
  });

  it("happy path returns downloadPdf effect with correct URL (en)", () => {
    const ctx = makeCtxWithApi("en");
    const result = download.run(["cv.pdf"], ctx);
    expect(result.effect).toBe("downloadPdf");
    if (result.effect !== "downloadPdf") return;
    expect(result.url).toBe(`${API_URL}/api/cv/pdf?lang=en`);
    expect(result.fallbackUrl).toBe("/cv-static-en.pdf");
    expect(result.filename).toBe("notpelos-cv-en.pdf");
  });

  it("degraded mode (empty api URL) still returns downloadPdf effect", () => {
    const ctx = makeCtx({ lang: "es", endpoints: { api: "", worker: "" } });
    const result = download.run(["cv.pdf"], ctx);
    expect(result.effect).toBe("downloadPdf");
    if (result.effect !== "downloadPdf") return;
    // url will be "/api/cv/pdf?lang=es" — starts with "/" so Terminal will detect degraded mode
    expect(result.url).toBe("/api/cv/pdf?lang=es");
    expect(result.fallbackUrl).toBe("/cv-static-es.pdf");
  });

  describe("fetch behavior (mocked)", () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      globalThis.fetch = vi.fn();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it("returns downloadPdf effect (fetch is handled by Terminal reducer, not the command)", () => {
      // The command itself is pure — it only returns the effect descriptor.
      // Fetch is done in Terminal's useEffect. So the command test just verifies the output shape.
      const ctx = makeCtxWithApi("es");
      const result = download.run(["cv.pdf"], ctx);
      expect(result.effect).toBe("downloadPdf");
    });
  });
});
