# Contenido del CV — Fuente de verdad bilingüe

Fuente canónica del contenido. Cuando arranque el frontend (Fase 1+) se trasladará a `apps/web/src/content/` como content collections de Astro.

---

## 0. Identidad

```yaml
fullName: Ismael Sánchez Aguilera Repullo
publicAlias: NotPelos
title:
  es: Desarrollador Backend · Java · Spring Boot · Microservicios
  en: Backend Developer · Java · Spring Boot · Microservices
contact:
  email: ismaelprr10@gmail.com
  phone: "+34 696 320 615"
  location: "Mairena del Aljarafe, Sevilla, España"
  github: https://github.com/NotPelos
  linkedin: https://www.linkedin.com/in/ismael-sanchez-aguilera-repullo/
availability:
  es: No busco activamente. Si el proyecto pinta bien, hablamos.
  en: Not actively looking. If the project's interesting, let's talk.
modality: remote
languages:
  - { code: es, label_es: "Nativo",            label_en: "Native" }
  - { code: en, label_es: "Profesional alto",  label_en: "Full professional" }
```

## 1. `about.md`

### ES

> 4,5 años haciendo backend en Java. Spring Boot, microservicios y la calma necesaria para que un sistema legacy no explote a media migración. He pasado por **NTT Data, Ayesa, Minsait, Softtek, Luca-TIC y ahora Aubay** — siempre tocando lo mismo que me importa: integración, estabilidad y código que no haga llorar al siguiente que entre.
>
> Empecé Ingeniería Informática en Jaén, me bajé del tren a tiempo y rematé con un ciclo de DAM. Por el camino me dio por estudiar diseño de videojuegos, así que mi stack profesional convive con scripts **LUA** para servidores de FiveM y bots de Discord en Python. La mezcla rara funciona.
>
> Disfruto el debug fino, refactorizar legacy sin romper nada, y arquitecturas que se explican con un café. Inglés profesional (un intercambio en Holanda y la Shell Eco Marathon en Rotterdam ayudaron). Remoto preferentemente.

### EN

> 4.5 years writing backend in Java. Spring Boot, microservices, and the patience to keep a legacy system from blowing up mid-migration. I've worked at **NTT Data, Ayesa, Minsait, Softtek, Luca-TIC and now Aubay** — always on the things I actually care about: integration, stability, and code that doesn't make the next dev cry.
>
> Started Computer Engineering at Jaén, jumped off in time, and finished with a vocational degree in software development. Picked up videogame design along the way, so my professional stack coexists with **LUA** scripts for FiveM servers and Discord bots in Python. The weird combo works.
>
> I enjoy deep debugging, refactoring legacy code without breaking it, and architectures you can explain over one coffee. Strong English (a 3-month exchange in the Netherlands and the Shell Eco Marathon in Rotterdam helped). Remote-first.

## 2. Highlights

> Los 4 logros más vendibles del recorrido. Encabezan la vista recruiter y el `neofetch`.

| # | ES | EN |
|---|---|---|
| 1 | **−25 %** de deuda técnica liderando la modernización Java legacy en Softtek | **−25 %** technical debt leading the Java legacy modernisation at Softtek |
| 2 | **99,9 %** de uptime sostenido en producción durante 2 años | **99.9 %** sustained production uptime over 2 years |
| 3 | **−30 %** errores de despliegue tras automatizar CI/CD con Jenkins | **−30 %** deployment errors after automating CI/CD with Jenkins |
| 4 | Conciliación de datos Snowflake ↔ DB2 para reporting de **Inditex** | Snowflake ↔ DB2 data reconciliation for **Inditex** reporting |

## 3. `experience/`

Cada bloque se renderiza como un `.md` en `experience/YYYY-empresa.md`.

---

### 3.1 Aubay — Software Developer · cliente Accenture
**Nov 2025 → presente · Sevilla (remoto)** · Stack: Java, Spring Boot, microservicios, Kafka

> Tras el cierre del contrato anterior, mismo cliente (Accenture) y mismo dominio — pero pasando de soporte de nivel 3 a construir features nuevas.

**ES**
- Desarrollo de nuevas funcionalidades sobre la plataforma de microservicios Java/Spring Boot del cliente.
- Diseño y consumo de tópicos Kafka para flujos asíncronos entre dominios.
- *[Ismael: añadir 1-2 logros concretos cuando los tengas — esto se actualiza solo en vivo gracias al filesystem virtual]*

**EN**
- Building new features on the client's Java/Spring Boot microservices platform.
- Designing and consuming Kafka topics for async cross-domain flows.
- *[Ismael: add 1-2 concrete wins as they happen]*

---

### 3.2 Luca-TIC — Application Support Analyst · cliente Accenture
**Feb 2025 → Nov 2025 · Sevilla** · Stack: Java, Spring Boot, Angular, Node.js, Kafka, Kibana, Jenkins, PostgreSQL, MongoDB

> Nivel 3 sobre sistemas distribuidos. El bug que ya pasó por L1 y L2 sin reproducirse aterrizaba aquí.

**ES**
- Cacé bugs de producción enterrados en logs de cuatro microservicios distintos — los que L1 y L2 no podían reproducir.
- Code analysis profundo en Java + Spring Boot + Angular + Node.js, identificando defectos críticos en fases tempranas del ciclo.
- Rediseño de tópicos y consumers de **Apache Kafka** para desacoplar servicios que llevaban demasiado tiempo acoplados.
- Investigación de incidentes con **Kibana** y pipelines de **Jenkins**; análisis con **PostgreSQL** y **MongoDB** cuando el origen estaba en los datos, no en el código.

**EN**
- Tracked production bugs buried in the logs of four different microservices — the ones L1 and L2 couldn't reproduce.
- Deep code review across Java + Spring Boot + Angular + Node.js, catching critical defects early.
- Redesigned **Apache Kafka** topics and consumers to decouple services that had been coupled for too long.
- Incident investigation with **Kibana** and **Jenkins** pipelines; **PostgreSQL** and **MongoDB** analysis when the root cause was in the data, not the code.

---

### 3.3 Softtek — Software Developer
**Ene 2023 → Nov 2024 (≈ 2 años) · Sevilla** · Stack: Java 8/11/17, Spring Boot, arquitectura hexagonal, Kafka, Jenkins, Snowflake, DB2, Docker, Grafana

> El puesto en el que más cosas pasaron. Modernización, automatización, soporte y reporting para cliente Inditex.

**ES**
- Lideré la migración de bases de código legacy a **Java 8/11/17** con arquitectura **hexagonal**, lambdas y Spring Boot — **deuda técnica reducida un 25 %**.
- Resolví cuellos de botella con patrones de diseño (Singleton, Factory) y **Kafka** para mensajería en tiempo real — **−15 % de latencia** en flujos críticos.
- Automaticé pipelines CI/CD con **Jenkins**: despliegues PRE/PRO predecibles, **−30 % de errores de despliegue**.
- Soporte N1/N2 con análisis de logs en **Grafana** — **99,9 % de uptime** sostenido en aplicaciones clave.
- Conciliación de datos **Snowflake ↔ DB2** con SQL avanzado para reporting empresarial de **Inditex**.
- APIs RESTful para integrar sistemas internos legacy con servicios nuevos.

**EN**
- Led legacy codebase migration to **Java 8/11/17** with **hexagonal architecture**, lambdas and Spring Boot — **technical debt down 25 %**.
- Resolved bottlenecks using design patterns (Singleton, Factory) and **Kafka** for real-time messaging — **−15 % latency** on critical flows.
- Automated CI/CD pipelines with **Jenkins**: predictable PRE/PRO deployments, **−30 % deploy errors**.
- N1/N2 production support with **Grafana** log analysis — sustained **99.9 % uptime** on key applications.
- **Snowflake ↔ DB2** data reconciliation with advanced SQL for **Inditex** enterprise reporting.
- RESTful APIs to integrate legacy internal systems with new services.

---

### 3.4 Minsait (Indra) — Software Technician
**Sep 2022 → Ene 2023 · Sevilla** · Stack: Java, Spring Boot microservicios

**ES**
- Full-stack Java + Spring Boot microservicios; integración front-back sin fricción.
- Resolución de bugs críticos: **errores del sistema −15 %**; **tiempos de respuesta clave −20 %**.
- Code review intenso y testing exhaustivo antes de release — incidencias post-release casi a cero.

**EN**
- Full-stack Java + Spring Boot microservices; clean front-back integration.
- Critical bug fixes: **system errors down 15 %**, **key feature response times down 20 %**.
- Thorough code review and pre-release testing — post-release issues close to zero.

---

### 3.5 Ayesa — Junior Developer
**Jul 2022 → Sep 2022 · Sevilla** · Stack: Java, SQL

**ES**
- Desarrollo Java con foco en code reviews y consultas SQL optimizadas.
- **−15 % bugs post-release**, **−20 % tiempo de entrega** del proyecto.

**EN**
- Java development with strong focus on code review and optimised SQL queries.
- **−15 % post-release bugs**, **−20 % project delivery time**.

---

### 3.6 NTT DATA Europe & LATAM — Junior Developer
**Nov 2021 → May 2022 · Málaga** · Stack: Java, testing automatizado

> Primer puesto. Donde aprendí que el bug no se ve hasta que el test lo dispara.

**ES**
- Implementé protocolos de testing automatizado — **+30 % de eficiencia** en el ciclo de pruebas.
- Troubleshooting técnico que liberaba al resto del equipo para foco en features.

**EN**
- Set up automated testing protocols — **+30 % testing efficiency**.
- Tech troubleshooting that freed the rest of the team to focus on features.

## 4. `projects/`

Cada proyecto encabeza con un *pitch* de una línea. Resto solo si aporta.

---

### 4.1 AuthServiceGame
**Tracker de tiempo de juego en microservicios.** Java · Spring Boot · JWT/OAuth2
[`github.com/NotPelos/AuthServiceGame`](https://github.com/NotPelos/AuthServiceGame)

**ES** — Sistema de microservicios para que un gamer mida cuánto juega, fije objetivos, y compare evolución entre títulos. JWT/OAuth2, tracking de sesiones, alertas de descanso. Integraciones en curso con Steam, PSN y Xbox Live.

**EN** — Microservices system for gamers to track playtime, set goals, and compare progress across titles. JWT/OAuth2, session tracking, break alerts. In-flight integrations with Steam, PSN and Xbox Live.

---

### 4.2 Discord-Bot
**Moderación automatizada para servidores FiveM RP.** Python · discord.py
[`github.com/NotPelos/Discord-Bot`](https://github.com/NotPelos/Discord-Bot)

**ES** — Bot que administra servidores de rol en FiveM: categorías y canales predefinidos, RBAC con colores hex personalizados, moderación automática, mensajes embebidos. Pensado para que el admin del server no se queme.

**EN** — Bot that manages FiveM role-play servers: predefined categories and channels, RBAC with custom hex colour roles, automated moderation, rich-embed messaging. Built so the server admin doesn't burn out.

---

### 4.3 robo_contenedores
**Mecánicas de atraco para GTA V multiplayer.** LUA · JavaScript · HTML · CSS
[`github.com/NotPelos/robo_contenedores`](https://github.com/NotPelos/robo_contenedores)

**ES** — Scripts custom para FiveM. Backend LUA optimizado para servidores con muchos jugadores en concurrencia; mini-juego embebido en JS/HTML/CSS para interacciones in-game.

**EN** — Custom FiveM scripts. Performance-tuned LUA backend for high-concurrency servers; embedded JS/HTML/CSS mini-game for in-game interactions.

---

### 4.4 ProductService
**Inventario para pequeños negocios.** Java · Spring Boot
[`github.com/NotPelos/ProductService`](https://github.com/NotPelos/ProductService)

**ES** — Backend de inventario con CRUD de productos, proveedores y clientes, registro de ventas/compras con actualización automática de stock, y métricas de top-sellers y reposición.

**EN** — Inventory backend: product/supplier/customer CRUD, sales & purchase logging with auto stock updates, top-seller and restocking metrics.

---

### 4.5 Curriculum *(este proyecto)*
**El CV que estás leyendo, demostrado en su propio código.** Astro · TS · Tailwind · Spring Boot · Cloudflare
*Repo público — Fase 1 del roadmap*

**ES** — Terminal interactivo Tokyo Night + microservicio Java sirviendo el PDF + Cloudflare Worker cacheando la GitHub API. Todo en free tier. Repo abierto porque **el código es el CV**.

**EN** — Tokyo Night interactive terminal + Java microservice serving the PDF + Cloudflare Worker caching the GitHub API. All on free tiers. Repo is public because **the code is the CV**.

## 5. `skills.json`

> Caja de herramientas que uso a diario. Niveles 1–5, donde **5 = lo defiendo en una entrevista a cuchillo**.

```json
{
  "languages": {
    "java":       { "level": 5, "yearsApprox": 5,   "note": "Spring Boot, Spring Cloud, JPA, async, JVM tuning básico" },
    "sql":        { "level": 4, "yearsApprox": 4,   "note": "PostgreSQL, DB2, Snowflake, queries de reconciliación" },
    "python":     { "level": 3, "yearsApprox": 2,   "note": "Bots Discord, scripting de utilidad" },
    "javascript": { "level": 3, "yearsApprox": 2,   "note": "Node.js para debug; Angular en mantenimiento" },
    "lua":        { "level": 3, "yearsApprox": 2,   "note": "Scripting de servidores FiveM" },
    "typescript": { "level": 2, "yearsApprox": 0.5, "note": "Aprendiendo con este proyecto (Astro)" }
  },
  "frameworks": {
    "spring-boot":  5,
    "spring-cloud": 4,
    "angular":      3,
    "ionic":        3,
    "node-js":      3,
    "discord-py":   3
  },
  "infra": {
    "docker":     4,
    "git":        5,
    "jenkins":    4,
    "kafka":      4,
    "kibana":     4,
    "grafana":    4,
    "linux":      4,
    "kubernetes": 3
  },
  "databases": {
    "postgresql": 4,
    "mongodb":    3,
    "db2":        3,
    "snowflake":  3,
    "sql-server": 3
  },
  "methods":  ["scrum", "agile", "code review", "pair programming", "tdd-básico"],
  "soft": [
    "Debug y troubleshooting profundo",
    "Comunicación cross-functional",
    "Mentoring de juniors",
    "Documentación técnica clara"
  ]
}
```

## 6. `education.md`

| Año | Centro | Titulación |
|---|---|---|
| 2015 | I.E.S Jándula · Andújar | Bachillerato |
| 2015 → 2016 | Universidad de Jaén | Ingeniería Informática *(cambio de rumbo)* |
| 2016 → 2019 | IES Francisco de los Ríos · Fernán Núñez | Técnico Superior en DAM |
| 2020 → 2021 | IES Ángel de Saavedra · Córdoba | CFGS Diseño de Videojuegos |

**Bootcamps**
- Everis / NTT Data — Java + Microservicios
- Everis / NTT Data — .NET
- Indra — Java + Microservicios

**Otros**
- Shell Eco Marathon Rotterdam — técnico en concurso de coches ecológicos
- Intercambio académico 3 meses en Holanda
- 12 años en academia de inglés
- Título por construir coche teledirigido con sensores Arduino

## 7. `contact.vcf`

Generada automáticamente desde el bloque `Identidad`. El comando `cat contact.vcf` la descarga.

## 8. AI fake — guion del comando `ai`

Matcher por keywords sobre el input. Si matchea **alguna** trigger, devuelve respuesta en el idioma activo. Si nada matchea, `fallback`. Mínimo 21 pares.

```yaml
- triggers: [hire, contratar, contratarte, fichar, cuando puedes empezar]
  es: "¿Contratarme? Rápido: `cat about.md`, `ls experience/`, decisión hecha."
  en: "Hire me? Quick path: `cat about.md`, `ls experience/`, decision made."

- triggers: [salary, sueldo, salario, cobrar, money, banda salarial]
  es: "Eso en privado. `cat contact.vcf` y me escribes."
  en: "That's a private conversation. `cat contact.vcf` and ping me."

- triggers: [java, spring, springboot, spring boot]
  es: "Pan de cada día. `cd experience` para ver dónde lo he reventado."
  en: "My daily bread. `cd experience` to see where I've put it to work."

- triggers: [microservices, microservicios]
  es: "Hexagonal, Kafka, eventos. Lo de verdad, no PowerPoint."
  en: "Hexagonal, Kafka, event-driven. The real thing — not slideware."

- triggers: [python]
  es: "Para scripts y bots. No soy data scientist, soy backend con buenas costumbres."
  en: "For scripts and bots. Not a data scientist — backend dev with good habits."

- triggers: [lua, fivem, gta]
  es: "Sí, juego al GTA RP. Y le escribo los scripts del servidor. Hobby útil, dame envidia."
  en: "Yes, I play GTA RP. And I write the server scripts for it. Useful hobby — eat your heart out."

- triggers: [react, vue, angular, frontend]
  es: "Toco frontend cuando hace falta. Mi territorio natural es el lado oscuro: backend."
  en: "I touch frontend when needed. Natural habitat: the dark side — backend."

- triggers: [vim, emacs, neovim]
  es: "vim, obviamente. Respeto a la gente de emacs… desde lejos."
  en: "vim, obviously. Respect for the emacs folks though… from a distance."

- triggers: [coffee, cafe, café]
  es: "Combustible primario. Sin él no hay PR."
  en: "Primary fuel. No PRs without it."

- triggers: [remote, remoto, teletrabajo]
  es: "Sí. Modalidad preferida. Entrego mejor sin ruido."
  en: "Yes. Preferred setup. I ship better without noise."

- triggers: [where, location, donde vives, sevilla]
  es: "Sevilla, Mairena del Aljarafe. Calor, microservicios y café."
  en: "Seville, Mairena del Aljarafe. Heat, microservices and coffee."

- triggers: [english, ingles, idiomas]
  es: "Español nativo, inglés profesional. Sobreviví 3 meses en Holanda."
  en: "Spanish native, English at professional level. Survived 3 months in the Netherlands."

- triggers: [linkedin]
  es: "linkedin.com/in/ismael-sanchez-aguilera-repullo — pero el CV real es éste."
  en: "linkedin.com/in/ismael-sanchez-aguilera-repullo — but the real CV is right here."

- triggers: [github, repos, proyectos]
  es: "github.com/NotPelos — `ls /var/log/github/` lo ves en vivo."
  en: "github.com/NotPelos — `ls /var/log/github/` to see it live."

- triggers: [why backend, por que backend, why java]
  es: "Porque me gusta pensar el sistema entero, no solo cómo se ve en mobile."
  en: "Because I like reasoning about the whole system, not just how it looks on mobile."

- triggers: [seniority, senior, junior, mid]
  es: "Mid-Senior en camino. 4,5 años en cosas que no son toy projects."
  en: "Mid-Senior in progress. 4.5 years on things that aren't toy projects."

- triggers: [available, disponible, buscas trabajo]
  es: "No busco activamente. Si el proyecto mola, hablamos."
  en: "Not actively looking. If the project's interesting, let's talk."

- triggers: [aws, gcp, azure, cloud]
  es: "He tocado, no me especializo. Docker + Kubernetes son mi zona cómoda."
  en: "Touched them, not specialised. Docker + Kubernetes is my comfort zone."

- triggers: [ai, llm, chatgpt, claude, openai]
  es: "Soy un guion con regex disfrazado de IA. La picardía es real, los embeddings no."
  en: "I'm a regex script in an AI costume. The wit is real, the embeddings are not."

- triggers: [matrix, neo, red pill, blue pill]
  es: "Prueba el código Konami. Sin spoilers."
  en: "Try the Konami code. No spoilers."

- triggers: [help, ayuda, que es esto, que haces]
  es: "Soy el comando `ai`. Pregúntame algo concreto o escribe `help` para volver a tierra firme."
  en: "I'm the `ai` command. Ask something specific or type `help` to get back to solid ground."

- fallback:
    es: "No tengo respuesta enlatada para eso. Prueba `help` o sé más específico — soy fake, no mágico."
    en: "No canned response for that. Try `help` or be more specific — I'm fake, not magical."
```

## 9. Easter eggs personalizados

```yaml
- cmd: sudo
  es: "Necesitas permisos de root. Como no los tienes, te ofrezco un café y nos olvidamos del tema."
  en: "You need root. Since you don't have it, I'll offer you a coffee and we forget about it."

- cmd: rm -rf /
  es: "Bonito intento. Cada archivo aquí es parte de mi CV — no voy a borrarlos por ti."
  en: "Nice try. Every file here is part of my CV — not deleting them for you."

- cmd: exit
  es: "No puedes huir, esto es un CV."
  en: "You can't escape — this is a CV."

- cmd: vim
  es: "Buen gusto. Pero estás dentro de un terminal dentro de un navegador. Hay límites."
  en: "Good taste. But you're in a terminal inside a browser. There are limits."

- cmd: emacs
  es: "Respeto las creencias ajenas. No nos las llevamos a la cama."
  en: "I respect other people's beliefs. We don't take them to bed with us."

- cmd: hack
  es: "Aquí ya estás dentro. Felicidades."
  en: "You're already in. Congrats."

- cmd: hello
  es: "Hola. ¿`help`?"
  en: "Hi there. `help`?"

- cmd: whoami (con detección bot)
  es: "<googlebot/gptbot> indexa lo que quieras, pero el que me contrate es humano."
  en: "<googlebot/gptbot> Index away, but whoever hires me will be human."
```

## 10. ASCII art para `neofetch`

> Pendiente — `architect` + `frontend-dev` lo dibujan en Fase 3. Decisión actual: silueta estilizada del logo Java a la izquierda; stats dinámicas a la derecha (top langs y nº de repos vía GitHub API).

---

## Estado del contenido

| Bloque | Estado |
|---|---|
| Identidad | ✓ |
| About ES/EN | ✓ revisar tono final |
| Highlights | ✓ |
| Experience | ✓ esqueleto sólido — solo falta rellenar Aubay cuando haya logros concretos |
| Projects | ✓ |
| Skills | ✓ niveles propuestos por mí; ajustar si me he pasado o quedado corto |
| Education | ✓ |
| AI fake | ✓ 21 pares + fallback |
| Easter eggs | ✓ 8 |
| ASCII neofetch | ⏳ Fase 3 |

**Pendiente con Ismael**
1. Confirmar tono del `about.md` (¿más picardía? ¿menos?).
2. Rellenar 1-2 bullets concretos del puesto actual en Aubay cuando los tengas.
3. Ajustar niveles de skills si los he calibrado mal.
4. Decir si hay easter eggs personales que quieras añadir (referencia a tu pueblo, manía, etc.).
