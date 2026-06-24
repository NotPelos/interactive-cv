import { describe, it, expect } from "vitest";
import { assertFsParity, getMinimalSeed } from "../fs/seed.js";
import type { FsNode } from "../fs/index.js";

describe("assertFsParity", () => {
  it("no lanza cuando los FS son simétricos", () => {
    const fsEs = getMinimalSeed("es");
    const fsEn = getMinimalSeed("en");
    expect(() => assertFsParity(fsEs, fsEn)).not.toThrow();
  });

  it("lanza cuando en el FS de 'en' falta un archivo presente en 'es'", () => {
    const fsEs = getMinimalSeed("es");
    const fsEn = getMinimalSeed("en");

    // Insertamos un archivo extra solo en la rama ES
    const notpelosNodeEs = (
      (fsEs["home"] as { type: "directory"; children: Record<string, FsNode> })
        .children["notpelos"] as { type: "directory"; children: Record<string, FsNode> }
    ).children;
    notpelosNodeEs["only-in-es.md"] = {
      type: "file",
      name: "only-in-es.md",
      content: "solo en español",
    };

    expect(() => assertFsParity(fsEs, fsEn)).toThrow(
      /FS asymmetry between langs at.*only-in-es\.md.*missing in en/
    );
  });

  it("lanza cuando en el FS de 'es' falta un archivo presente en 'en'", () => {
    const fsEs = getMinimalSeed("es");
    const fsEn = getMinimalSeed("en");

    // Insertamos un archivo extra solo en la rama EN
    const notpelosNodeEn = (
      (fsEn["home"] as { type: "directory"; children: Record<string, FsNode> })
        .children["notpelos"] as { type: "directory"; children: Record<string, FsNode> }
    ).children;
    notpelosNodeEn["only-in-en.md"] = {
      type: "file",
      name: "only-in-en.md",
      content: "only in english",
    };

    expect(() => assertFsParity(fsEs, fsEn)).toThrow(
      /FS asymmetry between langs at.*only-in-en\.md.*missing in es/
    );
  });
});
