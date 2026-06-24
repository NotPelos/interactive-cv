import type { Command } from "./types.js";

export const SOUND_STORAGE_KEY = "notpelos.sound";
export type SoundState = "on" | "off";
const VALID_STATES: SoundState[] = ["on", "off"];

function isValidSoundState(v: string): v is SoundState {
  return (VALID_STATES as string[]).includes(v);
}

export function readSoundStorage(): SoundState {
  try {
    const raw = localStorage.getItem(SOUND_STORAGE_KEY);
    if (raw !== null && isValidSoundState(raw)) return raw;
  } catch {
    // localStorage unavailable (SSR, private mode)
  }
  return "off";
}

export function writeSoundStorage(value: SoundState): void {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, value);
  } catch {
    // localStorage unavailable — silently ignore
  }
}

const sound: Command = {
  name: "sound",
  brief: {
    es: "Activa o desactiva el sonido de tecleo",
    en: "Enable or disable keystroke sound",
  },
  manual: {
    es: [
      "Uso: sound [on|off]",
      "Sin argumentos muestra el estado actual.",
      "sound on  → activa el sonido de tecleo (Web Audio API).",
      "sound off → desactiva el sonido.",
      "El estado se persiste en localStorage.",
    ],
    en: [
      "Usage: sound [on|off]",
      "With no arguments, shows the current state.",
      "sound on  → enables keystroke sound (Web Audio API).",
      "sound off → disables sound.",
      "State is persisted in localStorage.",
    ],
  },
  run(args, ctx) {
    if (args.length === 0 || args[0]?.trim() === "") {
      const current = readSoundStorage();
      const label =
        current === "on"
          ? ctx.lang === "en"
            ? "sound: on"
            : "sonido: activado"
          : ctx.lang === "en"
            ? "sound: off"
            : "sonido: desactivado";
      return {
        lines: [{ kind: "plain", segments: [{ text: label, color: "tn-text" }] }],
      };
    }

    const arg = args[0].trim().toLowerCase();

    if (!isValidSoundState(arg)) {
      const err =
        ctx.lang === "en"
          ? `sound: invalid option '${arg}' (use: on | off)`
          : `sound: opción inválida '${arg}' (usa: on | off)`;
      return {
        lines: [{ kind: "error", segments: [{ text: err, color: "tn-red" }] }],
      };
    }

    writeSoundStorage(arg);

    const msg =
      arg === "on"
        ? ctx.lang === "en"
          ? "🔊 sound on"
          : "🔊 sonido activado"
        : ctx.lang === "en"
          ? "🔇 sound off"
          : "🔇 sonido desactivado";

    return {
      lines: [{ kind: "plain", segments: [{ text: msg, color: "tn-green" }] }],
      effect: "setSound",
      soundEnabled: arg === "on",
    };
  },
};

export default sound;
