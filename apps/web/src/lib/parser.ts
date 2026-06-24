export type ParseResult =
  | { ok: true; cmd: string; args: string[]; raw: string }
  | { ok: false; error: string; raw: string };

/**
 * Tokenizes a terminal input string into a command and arguments.
 * Supports single and double quoted strings, collapses extra whitespace.
 * Returns { ok: false, error } when quotes are unterminated.
 * Does NOT execute or eval anything — pure string manipulation.
 */
export function parseCommand(input: string): ParseResult {
  const raw = input;
  const result = tokenize(input.trim());
  if (!result.ok) {
    return { ok: false, error: result.error, raw };
  }
  const tokens = result.tokens;
  const cmd = tokens[0] ?? "";
  const args = tokens.slice(1);
  return { ok: true, cmd, args, raw };
}

type TokenizeResult =
  | { ok: true; tokens: string[] }
  | { ok: false; error: string };

function tokenize(input: string): TokenizeResult {
  const tokens: string[] = [];
  let i = 0;
  const len = input.length;

  while (i < len) {
    const ch = input.charAt(i);

    // Skip whitespace
    if (ch === " " || ch === "\t") {
      i++;
      continue;
    }

    // Double-quoted string
    if (ch === '"') {
      i++;
      let token = "";
      while (i < len && input.charAt(i) !== '"') {
        // Strip control characters to prevent hidden-char injection
        const c = input.charAt(i);
        if (c.charCodeAt(0) >= 0x20) token += c;
        i++;
      }
      // fix 6: detect unterminated double quote
      if (i >= len) {
        return { ok: false, error: "unterminated quote" };
      }
      i++; // consume closing "
      tokens.push(token);
      continue;
    }

    // Single-quoted string
    if (ch === "'") {
      i++;
      let token = "";
      while (i < len && input.charAt(i) !== "'") {
        const c = input.charAt(i);
        if (c.charCodeAt(0) >= 0x20) token += c;
        i++;
      }
      // fix 6: detect unterminated single quote
      if (i >= len) {
        return { ok: false, error: "unterminated quote" };
      }
      i++; // consume closing '
      tokens.push(token);
      continue;
    }

    // Unquoted token — read until whitespace
    let token = "";
    while (i < len && input.charAt(i) !== " " && input.charAt(i) !== "\t") {
      const c = input.charAt(i);
      // Strip control characters
      if (c.charCodeAt(0) >= 0x20) token += c;
      i++;
    }
    if (token.length > 0) tokens.push(token);
  }

  return { ok: true, tokens };
}
