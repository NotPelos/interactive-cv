import type { Command } from "./types.js";
import clear from "./clear.js";
import whoami from "./whoami.js";
import pwd from "./pwd.js";
import ls from "./ls.js";
import cd from "./cd.js";
import cat from "./cat.js";
import history from "./history.js";
import help, { registry as helpRegistry } from "./help.js";
import man, { registry as manRegistry } from "./man.js";
import tree from "./tree.js";
import grep from "./grep.js";
import find from "./find.js";
import neofetch from "./neofetch.js";
import recruiter from "./recruiter.js";
import lang from "./lang.js";
import download from "./download.js";
import repos from "./repos.js";
import ai from "./ai.js";
import sound from "./sound.js";
import { sudo, rm, exit, vim, emacs, hack, hello } from "./eastereggs.js";

export const commandRegistry: Map<string, Command> = new Map([
  ["help", help],
  ["clear", clear],
  ["whoami", whoami],
  ["pwd", pwd],
  ["ls", ls],
  ["cd", cd],
  ["cat", cat],
  ["history", history],
  ["man", man],
  ["tree", tree],
  ["grep", grep],
  ["find", find],
  ["neofetch", neofetch],
  ["recruiter", recruiter],
  ["lang", lang],
  ["download", download],
  ["repos", repos],
  ["ai", ai],
  ["sound", sound],
  // Easter eggs — listed here so man + tab completion work, but not in help output
  ["sudo", sudo],
  ["rm", rm],
  ["exit", exit],
  ["vim", vim],
  ["emacs", emacs],
  ["hack", hack],
  ["hello", hello],
]);

// Inject the full registry into help and man so they can list/look up all commands.
// This mutation happens once at module load time, before any command is ever called.
// Easter eggs (sudo, rm, exit, vim, emacs, hack, hello) carry hidden: true so help
// filters them out. They remain in the registry so man + Tab completion still work.
for (const [k, v] of commandRegistry.entries()) {
  helpRegistry.set(k, v);
  manRegistry.set(k, v);
}

export type { Command };
