import type { Command, Line, Segment, SkillsData } from "./types.js";
import type { FsNode } from "../fs/index.js";

// Java logo ASCII art — decorative, informal use in personal CV
const JAVA_ART = [
  "   ██████  ",
  "  ████████ ",
  "  ████████ ",
  "   ██████  ",
  "  ████████ ",
  " ██████████",
  " ██ Java ██",
  " ██████████",
  "    ████   ",
  "  ████████ ",
];

function countFiles(children: Record<string, FsNode>): number {
  let count = 0;
  for (const node of Object.values(children)) {
    if (node.type === "file") {
      count++;
    } else {
      count += countFiles(node.children);
    }
  }
  return count;
}

// Fallback top-langs string when skillsData is unavailable (tests, SSR without prop)
const FALLBACK_TOP_LANGS = "Java 5/5 · SQL 4/5 · Python 3/5";

function buildTopLangs(skillsData: SkillsData | undefined): string {
  if (!skillsData) return FALLBACK_TOP_LANGS;

  const entries = Object.entries(skillsData.languages);
  if (entries.length === 0) return FALLBACK_TOP_LANGS;

  // Sort by level desc, then by yearsApprox desc for tie-breaking
  entries.sort(([, a], [, b]) => {
    if (b.level !== a.level) return b.level - a.level;
    return b.yearsApprox - a.yearsApprox;
  });

  return entries
    .slice(0, 3)
    .map(([name, data]) => {
      const displayName = name.charAt(0).toUpperCase() + name.slice(1);
      return `${displayName} ${data.level}/5`;
    })
    .join(" · ");
}

function calcUptime(lang: "es" | "en"): string {
  const startYear = 2021;
  const startMonth = 11; // November
  const now = new Date();
  const totalMonths =
    (now.getFullYear() - startYear) * 12 + (now.getMonth() + 1 - startMonth);
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (lang === "en") {
    if (months === 0) return `${years} years in backend`;
    return `${years} years ${months} months in backend`;
  }
  if (months === 0) return `${years} años en backend`;
  return `${years} años ${months} meses en backend`;
}

const neofetch: Command = {
  name: "neofetch",
  brief: {
    es: "Info del sistema en ASCII art",
    en: "System info as ASCII art",
  },
  manual: {
    es: [
      "Muestra las stats del sistema al estilo neofetch: logo Java + info de NotPelos.",
      "El uptime se calcula desde Nov 2021 (primer empleo). El conteo de archivos es en vivo.",
    ],
    en: [
      "Displays system stats neofetch-style: Java logo + NotPelos info.",
      "Uptime is calculated from Nov 2021 (first job). File count is live.",
    ],
  },
  run(_args, ctx) {
    // Count files in /home/notpelos
    const homeNode = ctx.fs["home"];
    let fileCount = 0;
    if (homeNode && homeNode.type === "directory") {
      const notpelosNode = homeNode.children["notpelos"];
      if (notpelosNode && notpelosNode.type === "directory") {
        fileCount = countFiles(notpelosNode.children);
      }
    }

    const uptime = calcUptime(ctx.lang);

    const neofetchHeader = ctx.promptUser ?? "user@cv";
    const neofetchHost = ctx.neofetchHost ?? "unknown";
    const separatorLine = "─".repeat(neofetchHeader.length);

    const stats: Array<{ label: string; value: string }> = [
      { label: neofetchHeader, value: "" },
      { label: separatorLine, value: "" },
      { label: "OS", value: "BackendDev Linux 5.x" },
      { label: "Host", value: neofetchHost },
      { label: "Kernel", value: "Java 21" },
      { label: "Uptime", value: uptime },
      { label: "Shell", value: "Spring Boot 3" },
      { label: "Top langs", value: buildTopLangs(ctx.skillsData) },
      { label: "Files", value: String(fileCount) + " en ~/"},
      { label: "Coffee", value: "████████████░ 92%" },
      { label: "vim/emacs", value: "vim ofc" },
    ];

    const lines: Line[] = [];
    const maxRows = Math.max(JAVA_ART.length, stats.length);

    for (let i = 0; i < maxRows; i++) {
      // i is a numeric loop index into readonly arrays — not user-controlled key
      // eslint-disable-next-line security/detect-object-injection
      const artLine = JAVA_ART[i] ?? "            ";
      // eslint-disable-next-line security/detect-object-injection
      const stat = stats[i];
      const segs: Segment[] = [{ text: artLine, color: "tn-red" }];

      if (stat) {
        if (stat.label === neofetchHeader) {
          segs.push({ text: "  " + stat.label, color: "tn-blue" });
        } else if (stat.label.startsWith("─")) {
          segs.push({ text: "  " + stat.label, color: "tn-border" });
        } else if (stat.value === "") {
          // separator or header with no value
          segs.push({ text: "  " + stat.label, color: "tn-text-dim" });
        } else {
          segs.push({ text: "  " + stat.label.padEnd(10), color: "tn-yellow" });
          segs.push({ text: stat.value, color: "tn-text" });
        }
      }

      lines.push({ kind: "plain", segments: segs });
    }

    return { lines };
  },
};

export default neofetch;
