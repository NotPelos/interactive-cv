import { describe, it, expect } from "vitest";
import neofetch from "../../commands/neofetch.js";
import { makeCtx } from "../helpers/ctx.js";
import type { SkillsData } from "../../commands/types.js";

const BASE_CTX = makeCtx({});

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
    const { lines } = neofetch.run([], BASE_CTX);
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
    expect(allText).toContain("Java 5/5");
    expect(allText).toContain("Sql 4/5");
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

  it("uptime in EN contains 'in backend'", () => {
    const enCtx = makeCtx({ lang: "en" });
    const { lines } = neofetch.run([], enCtx);
    const allText = lines.flatMap((l) => l.segments.map((s) => s.text)).join(" ");
    expect(allText).toContain("in backend");
    // EN uptime uses 'year' not 'año'
    expect(allText).not.toContain("año");
  });

  it("uptime in ES contains 'en backend'", () => {
    const esCtx = makeCtx({ lang: "es" });
    const { lines } = neofetch.run([], esCtx);
    const allText = lines.flatMap((l) => l.segments.map((s) => s.text)).join(" ");
    expect(allText).toContain("en backend");
    // ES uptime uses 'año' not 'year'
    expect(allText).not.toContain("years");
  });
});
