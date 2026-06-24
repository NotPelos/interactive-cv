---
title: RustEagle
pitch: "Co-founded an intelligence platform for Rust: team detection, combat telemetry and clan management. In real use in the community."
liveUrl: https://rusteagle.vercel.app
stack: ["Next.js", "TypeScript", "next-intl", "Steam API", "BattleMetrics API", "Auth", "App Router"]
lang: en
order: 3
---

In Rust, stepping onto a server blind is the fastest way to lose everything you've farmed since the last wipe. RustEagle fixes that: intel before the raid, not the post-mortem debrief.

Built **50/50 with a friend**. My side: the full backend — integration with the **Steam API** to pull player profiles and stats, scraping **BattleMetrics** to extract server history and connections, and the logic that cross-references both sources to feed the team detector. Frontend, multi-tenancy and i18n are shared work.

The most interesting technical challenge: the team detector builds force-directed graphs from server co-presence overlap to infer squad composition without anyone self-reporting.

In real production use by the Rust community. v1.0 deployed.

[Live demo →](https://rusteagle.vercel.app)
