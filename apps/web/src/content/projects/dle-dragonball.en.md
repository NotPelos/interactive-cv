---
title: dle Dragon Ball
pitch: Daily Dragon Ball Wordle. Guess the day's character by attributes.
liveUrl: https://dle.xpelos23.workers.dev
stack: ["Cloudflare Workers", "JavaScript", "KV"]
lang: en
order: 4
---

6 guesses, 1 character per day. Hints by attribute: race, origin, affiliation, saga. Miss it before Cell shows up and tomorrow is another chance.

Runs on edge runtime via Cloudflare Workers — zero cold start, sub-30ms latency. The daily character lives in KV storage: same character for every player, no central server needed.

Dark mode that follows the system preference. Full SEO, because even a nerd game deserves to be indexed properly.

[Live demo →](https://dle.xpelos23.workers.dev)
