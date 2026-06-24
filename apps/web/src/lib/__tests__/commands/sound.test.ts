/* eslint-disable security/detect-object-injection */
import { describe, it, expect, beforeEach, vi } from "vitest";
import sound, {
  readSoundStorage,
  writeSoundStorage,
  SOUND_STORAGE_KEY,
} from "../../commands/sound.js";
import { makeCtx } from "../helpers/ctx.js";

// ---------------------------------------------------------------------------
// localStorage mock — keys are controlled constants, not user input
// ---------------------------------------------------------------------------

const store: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { for (const k in store) delete store[k]; }),
  length: 0,
  key: vi.fn(() => null),
};

vi.stubGlobal("localStorage", localStorageMock);

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// readSoundStorage / writeSoundStorage
// ---------------------------------------------------------------------------

describe("readSoundStorage", () => {
  it("returns 'off' when nothing is stored", () => {
    expect(readSoundStorage()).toBe("off");
  });

  it("returns 'on' when 'on' is stored", () => {
    store[SOUND_STORAGE_KEY] = "on";
    expect(readSoundStorage()).toBe("on");
  });

  it("returns 'off' when 'off' is stored", () => {
    store[SOUND_STORAGE_KEY] = "off";
    expect(readSoundStorage()).toBe("off");
  });

  it("rejects invalid stored value and returns 'off'", () => {
    store[SOUND_STORAGE_KEY] = "yes";
    expect(readSoundStorage()).toBe("off");
  });

  it("rejects empty string and returns 'off'", () => {
    store[SOUND_STORAGE_KEY] = "";
    expect(readSoundStorage()).toBe("off");
  });
});

describe("writeSoundStorage", () => {
  it("writes 'on' to localStorage", () => {
    writeSoundStorage("on");
    expect(store[SOUND_STORAGE_KEY]).toBe("on");
  });

  it("writes 'off' to localStorage", () => {
    writeSoundStorage("off");
    expect(store[SOUND_STORAGE_KEY]).toBe("off");
  });
});

// ---------------------------------------------------------------------------
// sound command
// ---------------------------------------------------------------------------

describe("sound command — no args", () => {
  it("shows 'sonido: desactivado' in ES when off", () => {
    store[SOUND_STORAGE_KEY] = "off";
    const ctx = makeCtx({ lang: "es" });
    const { lines } = sound.run([], ctx);
    expect(lines[0]?.segments[0]?.text).toContain("desactivado");
  });

  it("shows 'sonido: activado' in ES when on", () => {
    store[SOUND_STORAGE_KEY] = "on";
    const ctx = makeCtx({ lang: "es" });
    const { lines } = sound.run([], ctx);
    expect(lines[0]?.segments[0]?.text).toContain("activado");
  });

  it("shows 'sound: off' in EN when off", () => {
    store[SOUND_STORAGE_KEY] = "off";
    const ctx = makeCtx({ lang: "en" });
    const { lines } = sound.run([], ctx);
    expect(lines[0]?.segments[0]?.text).toBe("sound: off");
  });

  it("shows 'sound: on' in EN when on", () => {
    store[SOUND_STORAGE_KEY] = "on";
    const ctx = makeCtx({ lang: "en" });
    const { lines } = sound.run([], ctx);
    expect(lines[0]?.segments[0]?.text).toBe("sound: on");
  });
});

describe("sound command — on/off", () => {
  it("sound on returns setSound effect with soundEnabled=true (ES)", () => {
    const ctx = makeCtx({ lang: "es" });
    const result = sound.run(["on"], ctx);
    expect(result.effect).toBe("setSound");
    if (result.effect !== "setSound") return;
    expect(result.soundEnabled).toBe(true);
    expect(result.lines[0]?.segments[0]?.text).toContain("activado");
  });

  it("sound off returns setSound effect with soundEnabled=false (ES)", () => {
    const ctx = makeCtx({ lang: "es" });
    const result = sound.run(["off"], ctx);
    expect(result.effect).toBe("setSound");
    if (result.effect !== "setSound") return;
    expect(result.soundEnabled).toBe(false);
    expect(result.lines[0]?.segments[0]?.text).toContain("desactivado");
  });

  it("sound on returns setSound effect with soundEnabled=true (EN)", () => {
    const ctx = makeCtx({ lang: "en" });
    const result = sound.run(["on"], ctx);
    expect(result.effect).toBe("setSound");
    if (result.effect !== "setSound") return;
    expect(result.soundEnabled).toBe(true);
    expect(result.lines[0]?.segments[0]?.text).toContain("sound on");
  });

  it("sound off persists to localStorage", () => {
    const ctx = makeCtx({ lang: "es" });
    sound.run(["off"], ctx);
    expect(store[SOUND_STORAGE_KEY]).toBe("off");
  });

  it("sound on persists to localStorage", () => {
    const ctx = makeCtx({ lang: "es" });
    sound.run(["on"], ctx);
    expect(store[SOUND_STORAGE_KEY]).toBe("on");
  });

  it("invalid arg returns error", () => {
    const ctx = makeCtx({ lang: "es" });
    const result = sound.run(["mute"], ctx);
    expect(result.lines[0]?.kind).toBe("error");
    expect(result.lines[0]?.segments[0]?.text).toContain("mute");
  });

  it("invalid arg in EN returns EN error", () => {
    const ctx = makeCtx({ lang: "en" });
    const result = sound.run(["true"], ctx);
    expect(result.lines[0]?.kind).toBe("error");
    expect(result.lines[0]?.segments[0]?.text).toContain("true");
  });

  it("result lines have success color (tn-green) for on/off", () => {
    const ctx = makeCtx({ lang: "es" });
    const result = sound.run(["on"], ctx);
    expect(result.lines[0]?.segments[0]?.color).toBe("tn-green");
  });
});
