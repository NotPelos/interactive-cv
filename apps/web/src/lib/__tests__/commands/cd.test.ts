import { describe, it, expect } from "vitest";
import cd from "../../commands/cd.js";
import { getMinimalSeed } from "../../fs/seed.js";

const HOME = ["home", "notpelos"];
const ctx = {
  cwd: HOME,
  prevCwd: ["home"] as string[] | null,
  history: [],
  fs: getMinimalSeed(),
};

describe("cd command", () => {
  it("cd with no args goes to home", () => {
    const startCtx = { ...ctx, cwd: ["home", "notpelos", "experience"] };
    const result = cd.run([], startCtx);
    expect(result.newCwd).toEqual(HOME);
    expect(result.lines).toHaveLength(0);
  });

  it("cd into a subdirectory", () => {
    const result = cd.run(["experience"], ctx);
    expect(result.newCwd).toEqual([...HOME, "experience"]);
    expect(result.lines).toHaveLength(0);
  });

  it("cd .. goes up one level", () => {
    const result = cd.run([".."], ctx);
    expect(result.newCwd).toEqual(["home"]);
  });

  it("cd - goes to previous directory when OLDPWD is set", () => {
    const result = cd.run(["-"], ctx);
    expect(result.newCwd).toEqual(ctx.prevCwd);
  });

  it("cd - returns error when OLDPWD is null (fix 7)", () => {
    const noOldpwdCtx = { ...ctx, prevCwd: null };
    const result = cd.run(["-"], noOldpwdCtx);
    expect(result.lines[0]?.kind).toBe("error");
    expect(result.lines[0]?.segments[0]?.text).toBe("cd: OLDPWD not set");
    expect(result.newCwd).toBeUndefined();
  });

  it("cd absolute path works", () => {
    const result = cd.run(["/home/notpelos/experience"], ctx);
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
    const result = cd.run(["experience"], ctx);
    expect(result.newPrevCwd).toEqual(HOME);
  });
});
