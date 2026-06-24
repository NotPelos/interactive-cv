import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const about = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/about" }),
  schema: z.object({
    title: z.string(),
    lang: z.literal("es"),
  }),
});

const experience = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/experience" }),
  schema: z.object({
    company: z.string(),
    role: z.string(),
    start: z.string().regex(/^\d{4}-\d{2}$/),
    end: z.union([z.string().regex(/^\d{4}-\d{2}$/), z.literal("present")]),
    location: z.string(),
    client: z.string().optional(),
    stack: z.array(z.string()),
    lang: z.literal("es"),
    order: z.number(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    pitch: z.string(),
    repo: z.string().url(),
    stack: z.array(z.string()),
    lang: z.literal("es"),
    order: z.number(),
  }),
});

const education = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/education" }),
  schema: z.object({
    title: z.string(),
    lang: z.literal("es"),
  }),
});

// Skills schema — validates skills.json structure at build time.
// z.record() in Zod v4 requires two arguments: key schema + value schema.
const skillLevel = z.object({
  level: z.number().int().min(1).max(5),
  yearsApprox: z.number(),
  note: z.string().optional(),
});

const skillsSchema = z.object({
  languages: z.record(z.string(), skillLevel),
  frameworks: z.record(z.string(), z.number().int().min(1).max(5)),
  infra: z.record(z.string(), z.number().int().min(1).max(5)),
  databases: z.record(z.string(), z.number().int().min(1).max(5)),
  methods: z.array(z.string()),
  soft: z.array(z.string()),
});

export { skillsSchema };

export const collections = { about, experience, projects, education };
