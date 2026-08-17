import { describe, it, expect } from "vitest";
import adapt from "../../commands/adapt.js";
import { makeCtx } from "../helpers/ctx.js";

describe("adapt command", () => {
  it("returns openAdapt effect in es", () => {
    const result = adapt.run([], makeCtx({ lang: "es" }));
    expect(result.effect).toBe("openAdapt");
    expect(result.lines[0]?.segments[0]?.text).toContain("adaptador");
  });

  it("returns openAdapt effect in en", () => {
    const result = adapt.run([], makeCtx({ lang: "en" }));
    expect(result.effect).toBe("openAdapt");
    expect(result.lines[0]?.segments[0]?.text).toContain("adapter");
  });

  it("ignores args", () => {
    const result = adapt.run(["--foo"], makeCtx({ lang: "es" }));
    expect(result.effect).toBe("openAdapt");
  });
});
