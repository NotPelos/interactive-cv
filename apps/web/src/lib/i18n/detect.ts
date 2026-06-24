import type { Lang } from "../commands/types.js";

export const LANG_STORAGE_KEY = "notpelos.lang";
const VALID_LANGS: readonly Lang[] = ["es", "en"];

export function isValidLang(value: unknown): value is Lang {
  return VALID_LANGS.includes(value as Lang);
}

export function detectLang(fallback: Lang = "es"): Lang {
  // localStorage tiene prioridad (validación estricta — no se confía en user input raw)
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (isValidLang(stored)) return stored;
  }
  // Auto-detección por idioma del navegador
  if (typeof navigator !== "undefined") {
    const nav = navigator.language ?? "";
    if (nav.startsWith("es")) return "es";
    if (nav.startsWith("en")) return "en";
  }
  return fallback;
}
