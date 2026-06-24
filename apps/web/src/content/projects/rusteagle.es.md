---
title: RustEagle
pitch: "Contribuyo a una plataforma de inteligencia para Rust: detección de equipos en vivo, telemetría de combate y gestión de clanes multi-tenant."
liveUrl: https://rusteagle.vercel.app
stack: ["Next.js", "TypeScript", "next-intl", "BattleMetrics API", "Auth", "App Router"]
lang: es
order: 3
---

En Rust, entrar a un servidor sin saber quién te rodea es la forma más rápida de perder lo que llevas farmando desde el wipe. RustEagle resuelve eso: inteligencia antes del raid, no el post-mortem.

Trabajo en la plataforma como contribuidor: frontend y feature work sobre Next.js App Router, integración con la API de BattleMetrics para extraer y cruzar historial de servidores. El reto técnico más interesante es el team detector — construye grafos dirigidos por fuerza sobre el overlap de co-presencia en servidores, para inferir equipos sin que nadie lo declare explícitamente.

Multi-tenancy real: organizaciones independientes con roles diferenciados (member / admin / superadmin) y auth propio. No es "cada usuario tiene sus datos" — es aislamiento de contexto completo por org.

i18n ES/EN con `next-intl` — el mismo patrón bilingüe que aplico en este CV.

[Demo en vivo →](https://rusteagle.vercel.app)
