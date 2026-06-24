import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../markdown/render.js";

describe("renderMarkdown", () => {
  it("H1 renders with tn-blue color and underline", () => {
    const lines = renderMarkdown("# Título");
    expect(lines[0]?.segments[0]?.color).toBe("tn-blue");
    expect(lines[0]?.segments[0]?.text).toBe("Título");
    // Second line is the underline
    expect(lines[1]?.segments[0]?.color).toBe("tn-blue");
    expect(lines[1]?.segments[0]?.text).toMatch(/^─+$/);
  });

  it("H2 renders with tn-magenta color and ▎ prefix, uppercase", () => {
    const lines = renderMarkdown("## sección dos");
    expect(lines[0]?.segments[0]?.color).toBe("tn-magenta");
    expect(lines[0]?.segments[0]?.text).toBe("▎ SECCIÓN DOS");
  });

  it("H3 renders with tn-cyan color and › prefix", () => {
    const lines = renderMarkdown("### Subsección");
    expect(lines[0]?.segments[0]?.color).toBe("tn-cyan");
    expect(lines[0]?.segments[0]?.text).toBe("› Subsección");
  });

  it("**bold** renders as tn-magenta segment", () => {
    const lines = renderMarkdown("texto **negrita** normal");
    const segs = lines[0]?.segments ?? [];
    const boldSeg = segs.find((s) => s.color === "tn-magenta");
    expect(boldSeg?.text).toBe("negrita");
  });

  it("*italic* renders as tn-cyan segment", () => {
    const lines = renderMarkdown("texto *cursiva* normal");
    const segs = lines[0]?.segments ?? [];
    const italicSeg = segs.find((s) => s.color === "tn-cyan");
    expect(italicSeg?.text).toBe("cursiva");
  });

  it("`code` renders as tn-yellow segment", () => {
    const lines = renderMarkdown("usa `npm run dev` ahora");
    const segs = lines[0]?.segments ?? [];
    const codeSeg = segs.find((s) => s.color === "tn-yellow");
    expect(codeSeg?.text).toBe("npm run dev");
  });

  it("horizontal rule --- renders as ─── line with tn-border", () => {
    const lines = renderMarkdown("---");
    expect(lines[0]?.segments[0]?.color).toBe("tn-border");
    expect(lines[0]?.segments[0]?.text).toMatch(/^─+$/);
    expect(lines[0]?.segments[0]?.text.length).toBe(60);
  });

  it("unordered list item renders with • bullet in tn-blue", () => {
    const lines = renderMarkdown("- elemento de lista");
    expect(lines[0]?.segments[0]?.text).toBe("• ");
    expect(lines[0]?.segments[0]?.color).toBe("tn-blue");
    expect(lines[0]?.segments[1]?.text).toBe("elemento de lista");
  });

  it("numbered list item renders number in tn-blue", () => {
    const lines = renderMarkdown("1. primer item");
    expect(lines[0]?.segments[0]?.color).toBe("tn-blue");
    expect(lines[0]?.segments[0]?.text).toBe("1. ");
  });

  it("link [text](url) renders text in tn-magenta and url in tn-text-dim", () => {
    const lines = renderMarkdown("[GitHub](https://github.com)");
    const segs = lines[0]?.segments ?? [];
    const textSeg = segs.find((s) => s.color === "tn-magenta");
    const urlSeg = segs.find((s) => s.color === "tn-text-dim");
    expect(textSeg?.text).toBe("GitHub");
    expect(urlSeg?.text).toContain("https://github.com");
  });

  it("code block renders lines with tn-yellow and 2-space indent", () => {
    const lines = renderMarkdown("```\nconst x = 1;\n```");
    expect(lines[0]?.segments[0]?.color).toBe("tn-yellow");
    expect(lines[0]?.segments[0]?.text.startsWith("  ")).toBe(true);
  });

  it("table row renders | separators in tn-border", () => {
    const lines = renderMarkdown("| Col A | Col B |\n|---|---|\n| a | b |");
    const headerLine = lines[0];
    expect(headerLine).toBeDefined();
    const borderSeg = headerLine?.segments.find((s) => s.color === "tn-border");
    expect(borderSeg).toBeDefined();
  });

  it("empty line renders as empty segment", () => {
    const lines = renderMarkdown("\n\n");
    expect(lines.some((l) => l.segments[0]?.text === "")).toBe(true);
  });

  it("table row with trailing pipe renders all columns", () => {
    // "| a | b |" — trailing pipe present
    const lines = renderMarkdown("| a | b |\n|---|---|\n| val1 | val2 |");
    const dataRow = lines[1]; // index 0 is header, index 1 is data (separator skipped)
    expect(dataRow).toBeDefined();
    const texts = dataRow!.segments.map((s) => s.text);
    expect(texts.some((t) => t === "val1")).toBe(true);
    expect(texts.some((t) => t === "val2")).toBe(true);
  });

  it("table row without trailing pipe renders all columns", () => {
    // "| a | b" — no trailing pipe
    const lines = renderMarkdown("| a | b\n|---|---|\n| val1 | val2");
    const dataRow = lines[1];
    expect(dataRow).toBeDefined();
    const texts = dataRow!.segments.map((s) => s.text);
    expect(texts.some((t) => t === "val1")).toBe(true);
    expect(texts.some((t) => t === "val2")).toBe(true);
  });
});
