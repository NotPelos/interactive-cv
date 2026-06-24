---
title: RustEagle
pitch: "Contributing to an intelligence platform for Rust: live team detection, combat telemetry and multi-tenant clan management."
liveUrl: https://rusteagle.vercel.app
stack: ["Next.js", "TypeScript", "next-intl", "BattleMetrics API", "Auth", "App Router"]
lang: en
order: 3
---

In Rust, stepping onto a server blind is the fastest way to lose everything you've farmed since the last wipe. RustEagle fixes that: intel before the raid, not the post-mortem debrief.

I work on the platform as a contributor: frontend and feature work on Next.js App Router, integrating the BattleMetrics API to pull and cross-reference server history. The most interesting technical challenge is the team detector — it builds force-directed graphs from server co-presence overlap to infer squad composition without anyone self-reporting.

Proper multi-tenancy: independent organisations with differentiated roles (member / admin / superadmin) and real auth. Not "every user has their own row" — full context isolation per org.

i18n ES/EN via `next-intl` — same bilingual pattern I apply in this CV.

[Live demo →](https://rusteagle.vercel.app)
