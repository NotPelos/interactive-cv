import { describe, it, expect } from "vitest";
import cd from "../../commands/cd.js";
import { makeCtx } from "../helpers/ctx.js";
import type { CommandResult } from "../../commands/types.js";

const HOME = ["home", "notpelos"];
const ctx = makeCtx({ cwd: HOME, prevCwd: ["home"] });

// Narrowing helper: cd nunca devuelve setLang, navigate, downloadPdf ni fetchRepos,
// pero la discriminated union lo requiere para acceder a newCwd/newPrevCwd.
function asCdResult(r: CommandResult) {
  if (
    r.effect === "setLang" ||
    r.effect === "navigate" ||
    r.effect === "downloadPdf" ||
    r.effect === "fetchRepos"
  ) {
    throw new Error(`cd returned unexpected effect: ${r.effect}`);
  }
  return r;
}

describe("cd command", () => {
  it("cd with no args goes to home", () => {
    const startCtx = makeCtx({ cwd: ["home", "notpelos", "experience"] });
    const result = asCdResult(cd.run([], startCtx));
    expect(result.newCwd).toEqual(HOME);
    expect(result.lines).toHaveLength(0);
  });

  it("cd into a subdirectory", () => {
    const result = asCdResult(cd.run(["experience"], ctx));
    expect(result.newCwd).toEqual([...HOME, "experience"]);
    expect(result.lines).toHaveLength(0);
  });

  it("cd .. goes up one level", () => {
    const result = asCdResult(cd.run([".."], ctx));
    expect(result.newCwd).toEqual(["home"]);
  });

  it("cd - goes to previous directory when OLDPWD is set", () => {
    const result = asCdResult(cd.run(["-"], ctx));
    expect(result.newCwd).toEqual(["home"]);
  });

  it("cd - returns error when OLDPWD is null", () => {
    const noOldpwdCtx = makeCtx({ cwd: HOME, prevCwd: null });
    const result = asCdResult(cd.run(["-"], noOldpwdCtx));
    expect(result.lines[0]?.kind).toBe("error");
    expect(result.lines[0]?.segments[0]?.text).toBe("cd: OLDPWD not set");
    expect(result.newCwd).toBeUndefined();
  });

  it("cd absolute path works", () => {
    const result = asCdResult(cd.run(["/home/notpelos/experience"], ctx));
    expect(result.newCwd).toEqual([...HOME, "experience"]);
  });

  it("cd into non-existent dir returns error", () => {
    const result = cd.run(["nope"], ctx);
    expect(result.lines[0]?.kind).toBe("error");
    expect(result.lines[0]?.segments[0]?.text).toContain("No such file or directory");
  });

  it("cd into a file returns error", () => {
    const result = cd.run(["about.md"], ctx);
    expect(result.lines[0]?.kind).toBe("error");
    expect(result.lines[0]?.segments[0]?.text).toContain("Not a directory");
  });

  it("saves previous cwd on successful navigation", () => {
    const result = asCdResult(cd.run(["experience"], ctx));
    expect(result.newPrevCwd).toEqual(HOME);
  });
});
