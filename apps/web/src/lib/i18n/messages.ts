import type { Lang } from "../commands/types.js";

// ---------------------------------------------------------------------------
// Message keys used across commands and UI
// ---------------------------------------------------------------------------

export type MessageKey =
  // Generic errors
  | "noSuchFile"
  | "notADirectory"
  | "isADirectory"
  | "oldpwdNotSet"
  | "syntaxError"
  // Command-specific
  | "catMissingArg"
  | "grepUsage"
  | "findUsage"
  | "findCwdError"
  | "noResults"
  | "searchTruncated"
  | "manNoEntry"
  | "manWhatPage"
  | "historyEmpty"
  // whoami
  | "visitor"
  // help
  | "helpHeader"
  | "helpTip"
  | "helpTipMan"
  // lang command
  | "langCurrent"
  | "langSetEs"
  | "langSetEn"
  | "langUnsupported"
  // recruiter
  | "recruiterStub"
  | "recruiterHint"
  // not found
  | "cmdNotFound"
  | "cmdNotFoundHint";

type MessageValue = string | ((args: Record<string, string>) => string);

export const messages: Record<Lang, Record<MessageKey, MessageValue>> = {
  es: {
    noSuchFile: (a) => `${a["cmd"] ?? ""}: ${a["path"] ?? ""}: No such file or directory`,
    notADirectory: (a) => `${a["cmd"] ?? ""}: ${a["path"] ?? ""}: Not a directory`,
    isADirectory: (a) => `${a["cmd"] ?? ""}: ${a["path"] ?? ""}: Is a directory`,
    oldpwdNotSet: "cd: OLDPWD not set",
    syntaxError: (a) => `syntax error: ${a["detail"] ?? ""}`,
    catMissingArg: "cat: falta operando de archivo",
    grepUsage: "grep: uso: grep <patrón> <archivo|directorio>",
    findUsage: "find: uso: find <patrón>",
    findCwdError: "find: error al acceder al directorio actual",
    noResults: "(sin resultados)",
    searchTruncated: "(búsqueda truncada al alcanzar el límite de profundidad/nodos)",
    manNoEntry: (a) => `man: no hay entrada de manual para '${a["cmd"] ?? ""}'`,
    manWhatPage: "man: ¿qué página de manual quieres?",
    historyEmpty: "(historial vacío)",
    visitor: "visitante",
    helpHeader: "Comandos disponibles:",
    helpTip: "usa Tab para autocompletar. ",
    helpTipMan: " para ayuda detallada.",
    langCurrent: (a) => `idioma actual: ${a["name"] ?? a["lang"] ?? ""}`,
    langSetEs: "idioma establecido: español",
    langSetEn: "idioma establecido: english",
    langUnsupported: (a) => `lang: idioma no soportado '${a["lang"] ?? ""}' (prueba: es | en)`,
    recruiterStub: "vista clásica disponible en Fase 5",
    recruiterHint: " en la esquina superior derecha.",
    cmdNotFound: (a) => `${a["cmd"] ?? ""}: comando no encontrado. Escribe `,
    cmdNotFoundHint: " para ver los disponibles.",
  },
  en: {
    noSuchFile: (a) => `${a["cmd"] ?? ""}: ${a["path"] ?? ""}: No such file or directory`,
    notADirectory: (a) => `${a["cmd"] ?? ""}: ${a["path"] ?? ""}: Not a directory`,
    isADirectory: (a) => `${a["cmd"] ?? ""}: ${a["path"] ?? ""}: Is a directory`,
    oldpwdNotSet: "cd: OLDPWD not set",
    syntaxError: (a) => `syntax error: ${a["detail"] ?? ""}`,
    catMissingArg: "cat: missing file operand",
    grepUsage: "grep: usage: grep <pattern> <file|directory>",
    findUsage: "find: usage: find <pattern>",
    findCwdError: "find: error accessing current directory",
    noResults: "(no results)",
    searchTruncated: "(search truncated: depth/node limit reached)",
    manNoEntry: (a) => `man: no manual entry for '${a["cmd"] ?? ""}'`,
    manWhatPage: "man: what manual page do you want?",
    historyEmpty: "(history empty)",
    visitor: "visitor",
    helpHeader: "Available commands:",
    helpTip: "use Tab to autocomplete. ",
    helpTipMan: " for detailed help.",
    langCurrent: (a) => `current language: ${a["name"] ?? a["lang"] ?? ""}`,
    langSetEs: "language set to español",
    langSetEn: "language set to english",
    langUnsupported: (a) => `lang: unsupported language '${a["lang"] ?? ""}' (try: es | en)`,
    recruiterStub: "classic view available in Phase 5",
    recruiterHint: " in the top-right corner.",
    cmdNotFound: (a) => `${a["cmd"] ?? ""}: command not found. Type `,
    cmdNotFoundHint: " to see available commands.",
  },
};
