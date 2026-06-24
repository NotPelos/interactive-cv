---
title: RustEagle
pitch: "Co-fundé una plataforma de inteligencia para Rust: detección de equipos, telemetría de combate y gestión de clanes. En uso real en la comunidad."
liveUrl: https://rusteagle.vercel.app
stack: ["Next.js", "TypeScript", "next-intl", "Steam API", "BattleMetrics API", "Auth", "App Router"]
lang: es
order: 3
---

En Rust, entrar a un servidor sin saber quién te rodea es la forma más rápida de perder lo que llevas farmando desde el wipe. RustEagle resuelve eso: inteligencia antes del raid, no el post-mortem.

Lo construí **50/50 con un amigo**. Mi parte: el backend completo — integración con la **API de Steam** para sacar perfiles y stats de jugadores, scraping de **BattleMetrics** para extraer historial de servidores y conexiones, y la lógica que cruza ambas fuentes para alimentar el team detector. La frontend, multi-tenancy y i18n son trabajo compartido.

El reto técnico más interesante: el team detector construye grafos dirigidos por fuerza sobre overlap de co-presencia en servidores, para inferir equipos sin que nadie los declare.

En producción real, usado por la comunidad de Rust. v1.0 desplegada.

[Demo en vivo →](https://rusteagle.vercel.app)
