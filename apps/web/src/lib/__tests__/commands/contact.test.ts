import { describe, it, expect } from "vitest";
import contact from "../../commands/contact.js";
import { makeCtx } from "../helpers/ctx.js";

describe("contact command", () => {
  it("returns openContact effect in es", () => {
    const ctx = makeCtx({ lang: "es" });
    const result = contact.run([], ctx);
    expect(result.effect).toBe("openContact");
    expect(result.lines[0]?.segments[0]?.text).toContain("formulario");
    expect(result.lines[0]?.segments[0]?.color).toBe("tn-yellow");
  });

  it("returns openContact effect in en", () => {
    const ctx = makeCtx({ lang: "en" });
    const result = contact.run([], ctx);
    expect(result.effect).toBe("openContact");
    expect(result.lines[0]?.segments[0]?.text).toContain("contact form");
  });

  it("ignores extra arguments", () => {
    const ctx = makeCtx({ lang: "es" });
    const result = contact.run(["--foo", "bar"], ctx);
    expect(result.effect).toBe("openContact");
  });
});
