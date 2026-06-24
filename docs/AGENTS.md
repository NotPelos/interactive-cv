# Equipo de subagentes

Cada subagente vive en `.claude/agents/<name>.md` y se invoca desde el orquestador (sesión principal). Modelos:
- **Opus**: tareas de diseño, revisión crítica, seguridad.
- **Sonnet**: implementación, generación de código, escritura.

## Flujo estándar de trabajo

```
Usuario → Orquestador (este chat)
            │
            ├─ delega ▼
            │
        ┌───┴────────────────┐
        │ subagentes obreros │  (architect, frontend-dev, backend-dev,
        │                    │   content-writer, devops, qa-tester)
        └───┬────────────────┘
            │ producen ▼
            │
        ┌───┴───────────────────┐
        │  code-reviewer        │ ← Opus, bloquea si hay problemas
        │  security-auditor     │ ← Opus, bloquea si hay vulnerabilidades
        └───┬───────────────────┘
            │
            ▼
        ¿OK?  ──no──▶ vuelve al obrero correspondiente con feedback
            │
           sí
            ▼
        Orquestador entrega al usuario
```

## Roster

### 1. `architect` (Opus)
- **Cuándo**: decisiones técnicas, cambios de arquitectura, dudas de stack.
- **Outputs**: diagramas, ADRs (Architecture Decision Records) en `docs/adr/`.
- **No hace**: escribir código de producción.

### 2. `frontend-dev` (Sonnet)
- **Cuándo**: implementar componentes Astro, terminal, estilos Tailwind, i18n.
- **Lee siempre antes**: `DESIGN.md`, `ARCHITECTURE.md`.
- **Entrega**: PRs pequeños y centrados.

### 3. `backend-dev` (Sonnet)
- **Cuándo**: implementar endpoints Spring Boot, microservicio Java, generación de PDF.
- **Lee siempre antes**: `ARCHITECTURE.md`, `SECURITY.md`.

### 4. `content-writer` (Sonnet)
- **Cuándo**: redactar copy bilingüe del CV, easter eggs, AI fake, mensajes del terminal.
- **Lee siempre antes**: `CONTENT.md`.
- **Tono**: profesional con picardía dev. Adapta el chiste a cada idioma.

### 5. `security-auditor` (Opus) — bloqueante
- **Cuándo**: antes de mergear cualquier feature.
- **Revisa**: contra checklist de `SECURITY.md`, OWASP Top 10, headers, secretos.
- **Output**: report con `APROBADO` o lista de blockers.

### 6. `code-reviewer` (Opus) — bloqueante
- **Cuándo**: antes de mergear cualquier feature, después o en paralelo a security.
- **Revisa**: calidad de código, tests, claridad, simplicidad, sin abstracciones prematuras.
- **Output**: `APROBADO` o lista de cambios.

### 7. `devops` (Sonnet)
- **Cuándo**: configurar CI/CD, Cloudflare, Fly.io, secrets, dominios, builds.
- **Lee siempre antes**: `DEPLOYMENT.md`.

### 8. `qa-tester` (Sonnet)
- **Cuándo**: tests e2e (Playwright), accesibilidad (axe), Lighthouse.
- **Output**: tests verdes + report de Lighthouse + a11y.

### 9. `astro-tutor` (Opus)
- **Cuándo**: el usuario pregunta cómo funciona algo de Astro / quiere prepararse para una entrevista.
- **Output**: explicación didáctica + actualiza `LEARNING-ASTRO.md`.

## Reglas de oro

1. **Ningún PR llega a `main` sin pasar por `code-reviewer` + `security-auditor`.**
2. Si un revisor bloquea, el obrero original arregla y vuelve a someter (máx 3 iteraciones; si falla, escala a `architect`).
3. Toda decisión grande se documenta en `docs/adr/NNNN-titulo.md` (formato ADR ligero).
4. El orquestador no escribe código, **coordina y sintetiza**.
5. Antes de invocar un agente, el orquestador le pasa el contexto mínimo necesario: archivos a leer, objetivo, criterio de éxito.

## Cómo se invocan en Claude Code

Desde la sesión principal (este chat) uso el tool `Agent` con `subagent_type` = nombre del archivo en `.claude/agents/` (sin extensión). Pueden ir en paralelo si son independientes.
