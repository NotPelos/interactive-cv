// Known bot identifiers — stored in display casing; comparison uses pre-lowercased list.
const BOT_SIGNATURES = [
  "Googlebot",
  "Bingbot",
  "GPTBot",
  "ClaudeBot",
  "PerplexityBot",
  "YandexBot",
  "AhrefsBot",
  "SemrushBot",
  "DuckDuckBot",
  "Baiduspider",
  "facebookexternalhit",
  "Twitterbot",
  "LinkedInBot",
] as const;

// Pre-lowercased once at module load — avoids repeated .toLowerCase() per call.
const BOT_SIGS_LOWER: readonly string[] = BOT_SIGNATURES.map((s) => s.toLowerCase());

/**
 * Returns the matched bot name (display casing from BOT_SIGNATURES) or null.
 * Accepts any string so it can be called in tests without a real navigator.
 */
export function detectBot(userAgent: string): string | null {
  const ua = userAgent.toLowerCase();
  for (let i = 0; i < BOT_SIGS_LOWER.length; i++) {
    // i is a clamped numeric index, not user-controlled input
    // eslint-disable-next-line security/detect-object-injection
    if (ua.includes(BOT_SIGS_LOWER[i]!)) {
      // eslint-disable-next-line security/detect-object-injection
      return BOT_SIGNATURES[i] as string;
    }
  }
  return null;
}
