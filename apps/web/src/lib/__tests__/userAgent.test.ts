import { describe, it, expect } from "vitest";
import { detectBot } from "../userAgent.js";

describe("detectBot", () => {
  // Known bots — should return the bot signature name
  it("detects Googlebot", () => {
    const ua = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
    expect(detectBot(ua)).toBe("Googlebot");
  });

  it("detects Bingbot", () => {
    const ua = "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)";
    expect(detectBot(ua)).toBe("Bingbot");
  });

  it("detects GPTBot", () => {
    const ua = "GPTBot/1.0 (+https://openai.com/gptbot)";
    expect(detectBot(ua)).toBe("GPTBot");
  });

  it("detects ClaudeBot", () => {
    const ua = "ClaudeBot/1.0; +https://www.anthropic.com/claude-bot";
    expect(detectBot(ua)).toBe("ClaudeBot");
  });

  it("detects PerplexityBot", () => {
    const ua = "PerplexityBot/1.0";
    expect(detectBot(ua)).toBe("PerplexityBot");
  });

  it("detects YandexBot", () => {
    const ua = "Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)";
    expect(detectBot(ua)).toBe("YandexBot");
  });

  it("detects AhrefsBot", () => {
    const ua = "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)";
    expect(detectBot(ua)).toBe("AhrefsBot");
  });

  it("detects SemrushBot", () => {
    const ua = "Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)";
    expect(detectBot(ua)).toBe("SemrushBot");
  });

  it("detects DuckDuckBot", () => {
    const ua = "DuckDuckBot/1.1; (+http://duckduckgo.com/duckduckbot.html)";
    expect(detectBot(ua)).toBe("DuckDuckBot");
  });

  it("detects Baiduspider", () => {
    const ua = "Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)";
    expect(detectBot(ua)).toBe("Baiduspider");
  });

  it("detects facebookexternalhit", () => {
    const ua = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";
    expect(detectBot(ua)).toBe("facebookexternalhit");
  });

  it("detects Twitterbot", () => {
    const ua = "Twitterbot/1.0";
    expect(detectBot(ua)).toBe("Twitterbot");
  });

  it("detects LinkedInBot", () => {
    const ua = "LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)";
    expect(detectBot(ua)).toBe("LinkedInBot");
  });

  // Case-insensitivity
  it("is case-insensitive for Googlebot", () => {
    expect(detectBot("GOOGLEBOT/2.1")).toBe("Googlebot");
  });

  // Normal browsers — should return null
  it("returns null for Chrome desktop", () => {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    expect(detectBot(ua)).toBeNull();
  });

  it("returns null for Firefox", () => {
    const ua = "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0";
    expect(detectBot(ua)).toBeNull();
  });

  it("returns null for Safari iOS", () => {
    const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    expect(detectBot(ua)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(detectBot("")).toBeNull();
  });

  it("returns null for curl", () => {
    expect(detectBot("curl/7.88.1")).toBeNull();
  });
});
