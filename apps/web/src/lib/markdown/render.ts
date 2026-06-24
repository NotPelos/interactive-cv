/* eslint-disable security/detect-object-injection */
import type { Line, Segment, TokyoColor } from "../commands/types.js";

// ---------------------------------------------------------------------------
// Inline span parser — handles **bold**, *italic*, `code`, [text](url)
// Linear single-pass, no backtracking. Safe against ReDoS.
// i is a numeric index into a string — not user-controlled object key injection.
// ---------------------------------------------------------------------------

function parseInline(text: string): Segment[] {
  const segments: Segment[] = [];
  let i = 0;
  let buf = "";

  const flush = (color?: TokyoColor) => {
    if (buf) {
      segments.push({ text: buf, color });
      buf = "";
    }
  };

  while (i < text.length) {
    // **bold** — two-asterisk span
    if (text[i] === "*" && text[i + 1] === "*") {
      flush();
      const close = text.indexOf("**", i + 2);
      if (close !== -1) {
        segments.push({ text: text.slice(i + 2, close), color: "tn-magenta" });
        i = close + 2;
        continue;
      }
    }

    // *italic* — single asterisk (only if not double)
    if (text[i] === "*" && text[i + 1] !== "*") {
      flush();
      const close = text.indexOf("*", i + 1);
      if (close !== -1) {
        segments.push({ text: text.slice(i + 1, close), color: "tn-cyan" });
        i = close + 1;
        continue;
      }
    }

    // `code` — backtick span
    if (text[i] === "`") {
      flush();
      const close = text.indexOf("`", i + 1);
      if (close !== -1) {
        segments.push({ text: text.slice(i + 1, close), color: "tn-yellow" });
        i = close + 1;
        continue;
      }
    }

    // [text](url) — link
    if (text[i] === "[") {
      const closeBracket = text.indexOf("]", i + 1);
      if (closeBracket !== -1 && text[closeBracket + 1] === "(") {
        const closeParen = text.indexOf(")", closeBracket + 2);
        if (closeParen !== -1) {
          flush();
          const linkText = text.slice(i + 1, closeBracket);
          const url = text.slice(closeBracket + 2, closeParen);
          segments.push({ text: linkText, color: "tn-magenta" });
          segments.push({ text: ` (${url})`, color: "tn-text-dim" });
          i = closeParen + 1;
          continue;
        }
      }
    }

    buf += text[i];
    i++;
  }

  flush();
  return segments;
}

// ---------------------------------------------------------------------------
// Block-level state
// ---------------------------------------------------------------------------

type BlockState = "normal" | "code-block" | "table";

// ---------------------------------------------------------------------------
// Main render function
// ---------------------------------------------------------------------------

export function renderMarkdown(raw: string): Line[] {
  const lines = raw.split("\n");
  const result: Line[] = [];
  let state: BlockState = "normal";
  let tableStarted = false;

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li] ?? "";

    // ---- Code block open/close ````
    if (line.startsWith("```")) {
      if (state === "code-block") {
        state = "normal";
      } else {
        state = "code-block";
      }
      continue;
    }

    if (state === "code-block") {
      result.push({
        kind: "plain",
        segments: [{ text: "  " + line, color: "tn-yellow" }],
      });
      continue;
    }

    // ---- Horizontal rule --- or *** or ___
    if (/^(---|___|\*\*\*)$/.test(line.trim())) {
      result.push({
        kind: "plain",
        segments: [{ text: "─".repeat(60), color: "tn-border" }],
      });
      continue;
    }

    // ---- Table rows (lines containing |)
    if (line.includes("|")) {
      // Skip separator rows like |---|---|
      if (/^\|[\s|:-]+\|$/.test(line)) {
        tableStarted = true;
        continue;
      }
      tableStarted = true;
      const parts = line.split("|");
      // Handle both trailing-pipe ("| a | b |") and no-trailing-pipe ("| a | b") rows.
      // After split: trailing pipe produces an empty last element; we drop it when empty.
      const hasTrailingPipe = parts[parts.length - 1]?.trim() === "";
      const cells = parts
        .slice(1, hasTrailingPipe ? -1 : undefined)
        .map((c) => c.trim());

      const segments: Segment[] = [];
      cells.forEach((cell, idx) => {
        segments.push({ text: "| ", color: "tn-border" });
        const inlineSegs = parseInline(cell);
        segments.push(...inlineSegs);
        if (idx < cells.length - 1) segments.push({ text: " ", color: "tn-text" });
      });
      segments.push({ text: " |", color: "tn-border" });
      result.push({ kind: "plain", segments });
      continue;
    } else if (tableStarted) {
      tableStarted = false;
    }

    // ---- H1 #
    if (line.startsWith("# ")) {
      const title = line.slice(2);
      result.push({
        kind: "plain",
        segments: [{ text: title, color: "tn-blue" }],
      });
      result.push({
        kind: "plain",
        segments: [{ text: "─".repeat(title.length), color: "tn-blue" }],
      });
      continue;
    }

    // ---- H2 ##
    if (line.startsWith("## ")) {
      const title = line.slice(3).toUpperCase();
      result.push({
        kind: "plain",
        segments: [{ text: "▎ " + title, color: "tn-magenta" }],
      });
      continue;
    }

    // ---- H3 ###
    if (line.startsWith("### ")) {
      const title = line.slice(4);
      result.push({
        kind: "plain",
        segments: [{ text: "› " + title, color: "tn-cyan" }],
      });
      continue;
    }

    // ---- Numbered list 1. 2. etc.
    const numberedMatch = /^(\d+)\.\s+(.*)$/.exec(line);
    if (numberedMatch) {
      const num = numberedMatch[1] ?? "";
      const rest = numberedMatch[2] ?? "";
      const segs: Segment[] = [{ text: num + ". ", color: "tn-blue" }];
      segs.push(...parseInline(rest));
      result.push({ kind: "plain", segments: segs });
      continue;
    }

    // ---- Unordered list - or *
    const bulletMatch = /^[-*]\s+(.*)$/.exec(line);
    if (bulletMatch) {
      const rest = bulletMatch[1] ?? "";
      const segs: Segment[] = [{ text: "• ", color: "tn-blue" }];
      segs.push(...parseInline(rest));
      result.push({ kind: "plain", segments: segs });
      continue;
    }

    // ---- Empty line
    if (line.trim() === "") {
      result.push({ kind: "plain", segments: [{ text: "" }] });
      continue;
    }

    // ---- Normal paragraph — parse inline
    result.push({ kind: "plain", segments: parseInline(line) });
  }

  return result;
}
