import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { detectLang, isValidLang } from "../i18n/detect.js";

// ---------------------------------------------------------------------------
// isValidLang
// ---------------------------------------------------------------------------
describe("isValidLang", () => {
  it("accepts 'es'", () => {
    expect(isValidLang("es")).toBe(true);
  });

  it("accepts 'en'", () => {
    expect(isValidLang("en")).toBe(true);
  });

  it("rejects 'fr'", () => {
    expect(isValidLang("fr")).toBe(false);
  });

  it("rejects XSS payload", () => {
    expect(isValidLang("<script>alert(1)</script>")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidLang("")).toBe(false);
  });

  it("rejects null", () => {
    expect(isValidLang(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isValidLang(undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// detectLang — localStorage
// ---------------------------------------------------------------------------
describe("detectLang — localStorage", () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      // eslint-disable-next-line security/detect-object-injection
      getItem: (k: string) => store[k] ?? null,
      // eslint-disable-next-line security/detect-object-injection
      setItem: (k: string, v: string) => { store[k] = v; },
      // eslint-disable-next-line security/detect-object-injection
      removeItem: (k: string) => { delete store[k]; },
    });
    vi.stubGlobal("navigator", { language: "fr-FR" }); // neutro para aislar localStorage
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const k of Object.keys(store)) {
      // eslint-disable-next-line security/detect-object-injection
      delete store[k];
    }
  });

  it("devuelve 'en' cuando localStorage contiene 'en'", () => {
    store["notpelos.lang"] = "en";
    expect(detectLang()).toBe("en");
  });

  it("devuelve 'es' cuando localStorage contiene 'es'", () => {
    store["notpelos.lang"] = "es";
    expect(detectLang()).toBe("es");
  });

  it("ignora valor inválido en localStorage y cae al fallback", () => {
    store["notpelos.lang"] = "<script>alert(1)</script>";
    // navigator es 'fr-FR' → no detecta nada → fallback "es"
    expect(detectLang()).toBe("es");
  });

  it("ignora valor inválido en localStorage y usa fallback explícito 'en'", () => {
    store["notpelos.lang"] = "malicious";
    expect(detectLang("en")).toBe("en");
  });

  it("devuelve fallback cuando localStorage está vacío y navigator no coincide", () => {
    expect(detectLang()).toBe("es");
  });
});

// ---------------------------------------------------------------------------
// detectLang — navigator.language
// ---------------------------------------------------------------------------
describe("detectLang — navigator.language", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: () => null, // localStorage vacío
      setItem: () => {},
      removeItem: () => {},
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detecta 'es' de navigator.language='es-ES'", () => {
    vi.stubGlobal("navigator", { language: "es-ES" });
    expect(detectLang()).toBe("es");
  });

  it("detecta 'en' de navigator.language='en-US'", () => {
    vi.stubGlobal("navigator", { language: "en-US" });
    expect(detectLang()).toBe("en");
  });

  it("detecta 'es' de navigator.language='es' (sin region)", () => {
    vi.stubGlobal("navigator", { language: "es" });
    expect(detectLang()).toBe("es");
  });

  it("cae a fallback 'es' con navigator.language='fr-FR'", () => {
    vi.stubGlobal("navigator", { language: "fr-FR" });
    expect(detectLang()).toBe("es");
  });

  it("cae a fallback explícito 'en' con navigator.language='ja'", () => {
    vi.stubGlobal("navigator", { language: "ja" });
    expect(detectLang("en")).toBe("en");
  });

  it("localStorage tiene prioridad sobre navigator", () => {
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => (k === "notpelos.lang" ? "en" : null),
      setItem: () => {},
      removeItem: () => {},
    });
    vi.stubGlobal("navigator", { language: "es-ES" });
    expect(detectLang()).toBe("en");
  });
});
