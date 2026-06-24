---
title: dle Dragon Ball
pitch: Wordle diario de Dragon Ball. Adivina el personaje del día por sus atributos.
liveUrl: https://dle.xpelos23.workers.dev
stack: ["Cloudflare Workers", "JavaScript", "KV"]
lang: es
order: 4
---

6 intentos, 1 personaje al día. Pistas por atributos: raza, origen, afiliación, saga. Si no lo aciertas antes de que llegue Cell, el día siguiente tienes otra oportunidad.

Corre en edge runtime sobre Cloudflare Workers — 0 cold start, latencia menor de 30ms. El personaje del día vive en KV: el mismo para todos los jugadores, sincronizado sin servidor central.

Dark mode adaptativo al sistema. SEO completo porque incluso un jueguecillo de frikis merece indexarse bien.

[Demo en vivo →](https://dle.xpelos23.workers.dev)
