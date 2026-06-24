import { describe, it, expect } from "vitest";
import { parseCommand } from "../parser.js";

describe("parseCommand", () => {
  it("parses a simple command with no args", () => {
    const result = parseCommand("help");
    if (!result.ok) throw new Error("expected ok");
    expect(result.cmd).toBe("help");
    expect(result.args).toEqual([]);
  });

  it("parses command with a single arg", () => {
    const result = parseCommand("ls /home");
    if (!result.ok) throw new Error("expected ok");
    expect(result.cmd).toBe("ls");
    expect(result.args).toEqual(["/home"]);
  });

  it("collapses multiple spaces between tokens", () => {
    const result = parseCommand("cat   about.md");
    if (!result.ok) throw new Error("expected ok");
    expect(result.cmd).toBe("cat");
    expect(result.args).toEqual(["about.md"]);
  });

  it("handles double-quoted arguments", () => {
    const result = parseCommand('cat "my file.md"');
    if (!result.ok) throw new Error("expected ok");
    expect(result.cmd).toBe("cat");
    expect(result.args).toEqual(["my file.md"]);
  });

  it("handles single-quoted arguments", () => {
    const result = parseCommand("cat 'my file.md'");
    if (!result.ok) throw new Error("expected ok");
    expect(result.cmd).toBe("cat");
    expect(result.args).toEqual(["my file.md"]);
  });

  it("returns empty cmd and args for empty input", () => {
    const result = parseCommand("");
    if (!result.ok) throw new Error("expected ok");
    expect(result.cmd).toBe("");
    expect(result.args).toEqual([]);
  });

  it("trims leading/trailing whitespace", () => {
    const result = parseCommand("  pwd  ");
    if (!result.ok) throw new Error("expected ok");
    expect(result.cmd).toBe("pwd");
    expect(result.args).toEqual([]);
  });

  it("parses multiple args", () => {
    const result = parseCommand("cd /home/notpelos");
    if (!result.ok) throw new Error("expected ok");
    expect(result.cmd).toBe("cd");
    expect(result.args).toEqual(["/home/notpelos"]);
  });

  it("strips control characters from tokens", () => {
    // \x01 is a control character below 0x20
    const result = parseCommand("cat \x01file.md");
    if (!result.ok) throw new Error("expected ok");
    expect(result.cmd).toBe("cat");
    // Control char is stripped, "file.md" survives
    expect(result.args).toEqual(["file.md"]);
  });

  it("preserves raw input in result", () => {
    const input = "  ls -la  ";
    const result = parseCommand(input);
    expect(result.raw).toBe(input);
  });

  // fix 6: unterminated quote detection
  it("returns error for unterminated double quote", () => {
    const result = parseCommand('cat "no_close');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected error");
    expect(result.error).toBe("unterminated quote");
  });

  it("returns error for unterminated single quote", () => {
    const result = parseCommand("cat 'no_close");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected error");
    expect(result.error).toBe("unterminated quote");
  });

  it("preserves raw input on parse error", () => {
    const input = 'cat "bad';
    const result = parseCommand(input);
    expect(result.raw).toBe(input);
  });
});
