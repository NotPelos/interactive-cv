import { describe, it, expect } from "vitest";
import stats from "../../commands/stats.js";
import { makeCtx } from "../helpers/ctx.js";

describe("stats command", () => {
  it("shows total and today with Spanish labels", () => {
    const ctx = makeCtx({ lang: "es", visits: { total: 1234, today: 42 } });
    const result = stats.run([], ctx);
    const totalLine = result.lines[0]!;
    expect(totalLine.segments[0]?.text.trim()).toBe("Visitas totales");
    // Just check the number is present; ICU grouping varies across Node builds.
    expect(totalLine.segments[1]?.text).toContain("1");
    expect(totalLine.segments[1]?.text).toContain("234");
    const todayLine = result.lines[1]!;
    expect(todayLine.segments[0]?.text.trim()).toBe("Hoy");
    expect(todayLine.segments[1]?.text).toBe("42");
  });

  it("uses English labels in en", () => {
    const ctx = makeCtx({ lang: "en", visits: { total: 1234, today: 5 } });
    const result = stats.run([], ctx);
    expect(result.lines[0]?.segments[0]?.text.trim()).toBe("Total visits");
    expect(result.lines[0]?.segments[1]?.text).toContain("1");
    expect(result.lines[0]?.segments[1]?.text).toContain("234");
  });

  it("degraded mode when visits are missing (es)", () => {
    const ctx = makeCtx({ lang: "es" });
    const result = stats.run([], ctx);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]?.segments[0]?.color).toBe("tn-red");
    expect(result.lines[0]?.segments[0]?.text).toContain("modo degradado");
  });

  it("degraded mode in English mentions degraded mode", () => {
    const ctx = makeCtx({ lang: "en" });
    const result = stats.run([], ctx);
    expect(result.lines[0]?.segments[0]?.text).toContain("degraded mode");
  });

  it("handles zero counters gracefully", () => {
    const ctx = makeCtx({ lang: "es", visits: { total: 0, today: 0 } });
    const result = stats.run([], ctx);
    expect(result.lines[0]?.segments[1]?.text).toBe("0");
    expect(result.lines[1]?.segments[1]?.text).toBe("0");
  });
});
