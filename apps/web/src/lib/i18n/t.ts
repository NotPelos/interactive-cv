import type { Lang } from "../commands/types.js";
import { messages, type MessageKey } from "./messages.js";

// ---------------------------------------------------------------------------
// t() — resolve a message key for a given language, with optional interpolation
// ---------------------------------------------------------------------------

export function t(key: MessageKey, lang: Lang, args?: Record<string, string>): string {
  // key is typed as MessageKey (closed union) — not user-controlled input
  // eslint-disable-next-line security/detect-object-injection
  const langMessages = messages[lang];
  // eslint-disable-next-line security/detect-object-injection
  const value = langMessages[key];

  if (typeof value === "function") {
    return value(args ?? {});
  }
  return value;
}

// Bind lang to produce a single-argument helper suitable for injection into Ctx.
export function makeT(lang: Lang): (key: string, args?: Record<string, string>) => string {
  return (key: string, args?: Record<string, string>) => {
    // Validate key is a known MessageKey before delegating
    // eslint-disable-next-line security/detect-object-injection
    if (key in messages[lang]) {
      return t(key as MessageKey, lang, args);
    }
    return key;
  };
}
