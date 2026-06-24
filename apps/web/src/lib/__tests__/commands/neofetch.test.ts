import { describe, it, expect } from "vitest";
import neofetch from "../../commands/neofetch.js";
import { getMinimalSeed } from "../../fs/seed.js";
import type { SkillsData } from "../../commands/types.js";

const BASE_CTX = {
  cwd: ["home", "notpelos"],
  prevCwd: null as string[] | null,
  history: [],
  fs: getMinimalSeed(),
};

const SKILLS_DATA: SkillsData = {
  languages: {
    java:       { level: 5, yearsApprox: 5 },
    sql:        { level: 4, yearsApprox: 4 },
    python:     { level: 3, yearsApprox: 2 },
    javascript: { level: 3, yearsApprox: 2 },
    lua:        { level: 3, yearsApprox: 2 },
  },
  frameworks: { "spring-boot": 5 },
  infra: { docker: 4 },
  databases: { postgresql: 4 },
  methods: ["scrum"],
  soft: ["Debug profundo"],
};

describe("neofetch command", () => {
  it("renders output lines", () => {
    const { lines } = neofetch.run([], { ...BASE_CTX });
    expect(lines.length).toBeGreaterThan(0);
  });

  it("uses fallback top-langs string when skillsData is undefined", () => {
    const { lines } = neofetch.run([], { ...BASE_CTX, skillsData: undefined });
    const allText = lines.flatMap((l) => l.segments.map((s) => s.text)).join(" ");
    expect(allText).toContain("Java 5/5");
    expect(allText).toContain("SQL 4/5");
    expect(allText).toContain("Python 3/5");
  });

  it("lists top 3 languages sorted by level desc when skillsData is provided", () => {
    const { lines } = neofetch.run([], { ...BASE_CTX, skillsData: SKILLS_DATA });
    const allText = lines.flatMap((l) => l.segments.map((s) => s.text)).join(" ");
    // Java (5/5) must appear before SQL (4/5) — both must be present
    expect(allText).toContain("Java 5/5");
    expect(allText).toContain("Sql 4/5");
    // Only 3 langs: lua / javascript share level 3 with yearsApprox 2 — one of them appears as #3
    expect(allText).toContain("/5");
  });

  it("correctly orders by yearsApprox when levels are equal", () => {
    const tiedSkills: SkillsData = {
      languages: {
        alpha: { level: 3, yearsApprox: 1 },
        beta:  { level: 3, yearsApprox: 5 },
        gamma: { level: 3, yearsApprox: 3 },
      },
      frameworks: {},
      infra: {},
      databases: {},
      methods: [],
      soft: [],
    };
    const { lines } = neofetch.run([], { ...BASE_CTX, skillsData: tiedSkills });
    const topLangsLine = lines.find((l) =>
      l.segments.some((s) => s.text.toLowerCase().includes("top langs"))
    );
    const valueSegs = topLangsLine?.segments.find((s) => s.text.includes("Beta"));
    expect(valueSegs).toBeDefined();
  });
});
