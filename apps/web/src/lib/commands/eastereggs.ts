import type { Command, Line } from "./types.js";

// Easter eggs — hidden: true keeps them out of `help` output.
// Still executable by name and documented via `man <cmd>`.

const sudo: Command = {
  name: "sudo",
  hidden: true,
  brief: {
    es: "Ejecuta como root (easter egg)",
    en: "Run as root (easter egg)",
  },
  run(_args, ctx) {
    const text =
      ctx.lang === "en"
        ? "You need root. Since you don't have it, I'll offer you a coffee and we forget about it."
        : "Necesitas permisos de root. Como no los tienes, te ofrezco un café y nos olvidamos del tema.";
    return {
      lines: [{ kind: "plain", segments: [{ text, color: "tn-magenta" }] }],
    };
  },
};

// `rm -rf /` is registered as "rm" internally; the parser strips flags.
// The Terminal routes "rm" to this handler — args will include "-rf" and "/".
// Intentionally instantaneous — no animation. The instant output is coherent
// because the "system" detects the attempt and stops it before any real work.
const rm: Command = {
  name: "rm",
  hidden: true,
  brief: {
    es: "Elimina archivos (easter egg)",
    en: "Remove files (easter egg)",
  },
  run(_args, ctx) {
    const destructionLines: Line[] = [
      { kind: "plain", segments: [{ text: "rm: removing /bin…", color: "tn-red" }] },
      { kind: "plain", segments: [{ text: "rm: removing /etc…", color: "tn-red" }] },
      { kind: "plain", segments: [{ text: "rm: removing /home…", color: "tn-red" }] },
      { kind: "plain", segments: [{ text: "rm: removing /usr…", color: "tn-red" }] },
      { kind: "plain", segments: [{ text: "rm: removing /var…", color: "tn-red" }] },
      { kind: "plain", segments: [{ text: "rm: removing /…", color: "tn-red" }] },
      {
        kind: "plain",
        segments: [
          {
            text:
              ctx.lang === "en"
                ? "Nice try. Every file here is part of my CV — not deleting them for you."
                : "Bonito intento. Cada archivo aquí es parte de mi CV — no voy a borrarlos por ti.",
            color: "tn-magenta",
          },
        ],
      },
    ];
    return { lines: destructionLines };
  },
};

const exit: Command = {
  name: "exit",
  hidden: true,
  brief: {
    es: "Salir del terminal (easter egg)",
    en: "Exit terminal (easter egg)",
  },
  run(_args, ctx) {
    const text =
      ctx.lang === "en"
        ? "You can't escape — this is a CV."
        : "No puedes huir, esto es un CV.";
    return {
      lines: [{ kind: "plain", segments: [{ text, color: "tn-magenta" }] }],
    };
  },
};

const vim: Command = {
  name: "vim",
  hidden: true,
  brief: {
    es: "Editor de texto (easter egg)",
    en: "Text editor (easter egg)",
  },
  run(_args, ctx) {
    const text =
      ctx.lang === "en"
        ? "Good taste. But you're in a terminal inside a browser. There are limits."
        : "Buen gusto. Pero estás dentro de un terminal dentro de un navegador. Hay límites.";
    return {
      lines: [{ kind: "plain", segments: [{ text, color: "tn-magenta" }] }],
    };
  },
};

const emacs: Command = {
  name: "emacs",
  hidden: true,
  brief: {
    es: "Editor de texto (easter egg)",
    en: "Text editor (easter egg)",
  },
  run(_args, ctx) {
    const text =
      ctx.lang === "en"
        ? "I respect other people's beliefs. We don't take them to bed with us."
        : "Respeto las creencias ajenas. No nos las llevamos a la cama.";
    return {
      lines: [{ kind: "plain", segments: [{ text, color: "tn-magenta" }] }],
    };
  },
};

const hack: Command = {
  name: "hack",
  hidden: true,
  brief: {
    es: "Hackear el sistema (easter egg)",
    en: "Hack the system (easter egg)",
  },
  run(_args, ctx) {
    const text =
      ctx.lang === "en"
        ? "You're already in. Congrats."
        : "Aquí ya estás dentro. Felicidades.";
    return {
      lines: [{ kind: "plain", segments: [{ text, color: "tn-magenta" }] }],
    };
  },
};

const hello: Command = {
  name: "hello",
  hidden: true,
  brief: {
    es: "Saludo (easter egg)",
    en: "Greeting (easter egg)",
  },
  run(_args, ctx) {
    const text = ctx.lang === "en" ? "Hi there. `help`?" : "Hola. ¿`help`?";
    return {
      lines: [{ kind: "plain", segments: [{ text, color: "tn-magenta" }] }],
    };
  },
};

export { sudo, rm, exit, vim, emacs, hack, hello };
