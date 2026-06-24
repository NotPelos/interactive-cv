import type { Command } from "./types.js";
import clear from "./clear.js";
import whoami from "./whoami.js";
import pwd from "./pwd.js";
import ls from "./ls.js";
import cd from "./cd.js";
import cat from "./cat.js";
import history from "./history.js";
import help, { registry as helpRegistry } from "./help.js";

export const commandRegistry: Map<string, Command> = new Map([
  ["help", help],
  ["clear", clear],
  ["whoami", whoami],
  ["pwd", pwd],
  ["ls", ls],
  ["cd", cd],
  ["cat", cat],
  ["history", history],
]);

// Inject the full registry into help so it can list all commands without a circular import.
// This mutation happens once at module load time, before any command is ever called.
for (const [k, v] of commandRegistry.entries()) {
  helpRegistry.set(k, v);
}

export type { Command };
