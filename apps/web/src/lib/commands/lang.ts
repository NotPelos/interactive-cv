import type { Command, Lang } from "./types.js";

const VALID_LANGS: Lang[] = ["es", "en"];

const lang: Command = {
  name: "lang",
  brief: {
    es: "Cambia el idioma de la interfaz",
    en: "Change the interface language",
  },
  manual: {
    es: [
      "Cambia el idioma activo entre español (es) e inglés (en).",
      "Sin argumentos muestra el idioma actual.",
      "Uso: lang [es|en]",
    ],
    en: [
      "Switches the active language between Spanish (es) and English (en).",
      "With no arguments, shows the current language.",
      "Usage: lang [es|en]",
    ],
  },
  run(args, ctx) {
    // El parser nunca emite tokens vacíos de unquoted args (ver parser.ts:86)
    // Quoted vacíos ("") son posibles, pero `lang ""` equivale a sin args.
    if (args.length === 0 || args[0]?.trim() === "") {
      const langName = ctx.lang === "en" ? "english" : "español";
      return {
        lines: [
          {
            kind: "plain",
            segments: [
              {
                text: ctx.t("langCurrent", { lang: ctx.lang, name: langName }),
                color: "tn-text",
              },
            ],
          },
        ],
      };
    }

    const requested = args[0].trim().toLowerCase();

    if (!VALID_LANGS.includes(requested as Lang)) {
      return {
        lines: [
          {
            kind: "error",
            segments: [
              {
                text: ctx.t("langUnsupported", { lang: requested }),
                color: "tn-red",
              },
            ],
          },
        ],
      };
    }

    const newLang = requested as Lang;
    const msgKey = newLang === "es" ? "langSetEs" : "langSetEn";

    return {
      lines: [
        {
          kind: "plain",
          segments: [
            {
              text: ctx.t(msgKey),
              color: "tn-green",
            },
          ],
        },
      ],
      effect: "setLang",
      lang: newLang,
    };
  },
};

export { VALID_LANGS };
export default lang;
