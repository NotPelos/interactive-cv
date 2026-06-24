import type { Ctx, Lang } from "../../commands/types.js";
import type { FsNode } from "../../fs/index.js";
import { getMinimalSeed } from "../../fs/seed.js";
import { makeT } from "../../i18n/t.js";

// Construye un Ctx de prueba con los overrides dados.
// Defaults: cwd=home/notpelos, lang=es, minimal seed FS.
export function makeCtx(
  overrides: Partial<Omit<Ctx, "t">> & { lang?: Lang; fs?: Record<string, FsNode> } = {}
): Ctx {
  const lang: Lang = overrides.lang ?? "es";
  return {
    cwd: overrides.cwd ?? ["home", "notpelos"],
    prevCwd: overrides.prevCwd ?? null,
    history: overrides.history ?? [],
    fs: overrides.fs ?? getMinimalSeed(lang),
    skillsData: overrides.skillsData,
    lang,
    t: makeT(lang),
  };
}
