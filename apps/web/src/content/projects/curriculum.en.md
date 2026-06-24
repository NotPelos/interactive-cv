---
title: Curriculum
pitch: The CV you're reading, built with AI subagent orchestration. The code is the evidence.
repo: https://github.com/NotPelos/curriculum
stack: ["Astro", "Preact", "TypeScript", "Tailwind", "Spring Boot", "Cloudflare Pages", "Cloudflare Workers", "Fly.io", "GitHub Actions"]
lang: en
order: 8
---

Tokyo Night interactive terminal + Java microservice serving the PDF on-demand + Cloudflare Worker caching the GitHub API. All on free tiers. Repo is public because **the code is the CV**.

354 tests (263 unit + 91 e2e/a11y). Lighthouse ≥ 95. Zero high-severity vulnerabilities in audit.

The part you don't usually get to see: **9 Claude Code subagents** — architect, frontend-dev, backend-dev, content-writer, devops, qa-tester, security-auditor, code-reviewer, astro-tutor — orchestrated from a single main session. Each cycle: orchestrator assigns → worker executes → code-reviewer + security-auditor sign off (blocking) → merge. About 10 distributed hours from zero to production on free tiers.

The subagents still live under `.claude/agents/` if you want to audit the process.
