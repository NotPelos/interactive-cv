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
]);

// Inject the full registry into help and man so they can list/look up all commands.
// This mutation happens once at module load time, before any command is ever called.
for (const [k, v] of commandRegistry.entries()) {
  helpRegistry.set(k, v);
  manRegistry.set(k, v);
}

export type { Command };
