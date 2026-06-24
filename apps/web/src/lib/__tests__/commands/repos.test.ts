import { describe, it, expect } from "vitest";
import repos from "../../commands/repos.js";
import { makeCtx } from "../helpers/ctx.js";

const WORKER_URL = "http://localhost:8787";

function makeCtxWithWorker(lang: "es" | "en" = "es") {
  return makeCtx({ lang, endpoints: { api: "", worker: WORKER_URL } });
}

describe("repos command", () => {
  it("returns fetchRepos effect with correct worker URL (es)", () => {
    const ctx = makeCtxWithWorker("es");
    const result = repos.run([], ctx);
    expect(result.effect).toBe("fetchRepos");
    if (result.effect !== "fetchRepos") return;
    expect(result.url).toBe(`${WORKER_URL}/api/github/repos`);
    expect(result.lines[0]?.segments[0]?.color).toBe("tn-yellow");
    expect(result.lines[0]?.segments[0]?.text).toContain("worker");
  });

  it("returns fetchRepos effect with correct worker URL (en)", () => {
    const ctx = makeCtxWithWorker("en");
    const result = repos.run([], ctx);
    expect(result.effect).toBe("fetchRepos");
    if (result.effect !== "fetchRepos") return;
    expect(result.url).toBe(`${WORKER_URL}/api/github/repos`);
    expect(result.lines[0]?.segments[0]?.text).toContain("worker");
  });

  it("degraded mode (empty worker URL) returns fetchRepos effect with empty-based URL", () => {
    const ctx = makeCtx({ lang: "es", endpoints: { api: "", worker: "" } });
    const result = repos.run([], ctx);
    expect(result.effect).toBe("fetchRepos");
    if (result.effect !== "fetchRepos") return;
    // url will be "/api/github/repos" — starts with "/" → Terminal detects degraded mode
    expect(result.url).toBe("/api/github/repos");
  });

  it("ignores extra args (repos takes no arguments)", () => {
    const ctx = makeCtxWithWorker();
    const result = repos.run(["--all", "--verbose"], ctx);
    expect(result.effect).toBe("fetchRepos");
  });
});
