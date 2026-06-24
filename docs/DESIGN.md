# Diseño UX y visual

> ⚠️ **Documento vivo.** Aquí se pule todo lo visual y la interacción. Iteraremos.

## Paleta Tokyo Night

```
Fondo principal     #1a1b26
Fondo elevado       #24283b
Borde sutil         #414868
Texto primario      #c0caf5
Texto secundario    #a9b1d6
Texto atenuado      #565f89
Prompt / acento     #7aa2f7   (azul)
Comando OK          #9ece6a   (verde)
Comando error       #f7768e   (rojo)
Warning             #e0af68   (amarillo)
Magenta acento      #bb9af7   (links, easter eggs)
Cyan info           #7dcfff
```

Fuente: **JetBrains Mono** (fallback `Fira Code`, `Cascadia Code`, `monospace`).

## Pantalla inicial

```
notpelos@curriculum:~$ █
```

Cursor parpadeante. Pre-impreso arriba:

```
╔════════════════════════════════════════════════════════════╗
║  Bienvenido. Escribe `help` si no sabes qué hacer.         ║
║  Welcome. Type `help` if you don't know what to do.        ║
╚════════════════════════════════════════════════════════════╝
```

Sin más adornos. **Hardcore**.

## Comandos del MVP

| Comando | Qué hace | Notas |
|---|---|---|
| `help` | Lista de comandos | Agrupados por categoría |
| `ls [path]` | Lista contenido de carpeta | Con colores tipo `ls --color` |
| `cd <path>` | Cambia de directorio | `cd ..`, `cd ~`, `cd -` funcionan |
| `pwd` | Ruta actual | |
| `cat <archivo>` | Muestra contenido | Renderiza MD bonito |
| `tree` | Árbol del filesystem | Salida ASCII |
| `whoami` | Quién eres tú (visitante) | Detecta user-agent con humor |
| `clear` | Limpia terminal | `Ctrl+L` también |
| `history` | Comandos anteriores | Flechas ↑↓ navegan |
| `man <comando>` | Ayuda de un comando | |
| `grep <patrón> <archivo>` | Búsqueda | Highlight de matches |
| `find <patrón>` | Busca archivos | |
| `sudo <cmd>` | Ejecuta como root | Pide password troll, da pista |
| `neofetch` | CV en ASCII art con stats | Hero visual |
| `lang es\|en` | Cambia idioma | Persiste en localStorage |
| `recruiter` | Vista clásica para no-devs | Navega a `/cv` |
| `contact` | Vías de contacto | Email, LinkedIn, GitHub |
| `download cv.pdf` | Descarga PDF | Llama al microservicio |
| `ai <pregunta>` | Asistente fake con guion | Respuestas pregrabadas con humor |
| `exit` | Easter egg | "Nice try" |
| `rm -rf /` | Easter egg | Animación de borrado fake |

## Filesystem virtual

```
/home/xpelos/
├── about.md
├── experience/
│   ├── 2024-empresa-actual.md
│   ├── 2022-empresa-anterior.md
│   └── ...
├── projects/
│   ├── microservicio-x.md
│   ├── proyecto-y.md
│   └── ...
├── skills.json
├── education.md
├── certifications.md
├── contact.vcf
└── .secrets/             # requiere `sudo`
    └── easter-eggs.md
/var/log/github/          # poblado dinámicamente
└── repos.json
/etc/lang/
├── es.json
└── en.json
```

## Interacciones

- **Autocompletado** con `Tab` (rutas y comandos).
- **Historial** con `↑` / `↓`.
- **Cancelar** con `Ctrl+C`.
- **Limpiar** con `Ctrl+L`.
- **Tooltip discreto** abajo a la derecha en hover sobre el terminal en móvil con chips de comandos sugeridos.

## Botón de escape (sólo móvil o primer minuto)

Esquina superior derecha: icono `👔` minúsculo (15×15 px) → `recruiter`. No estorba al hardcore pero salva al reclutador despistado.

## Vista recruiter (`/cv`)

- HTML estático puro, sin JS.
- Estructura clásica: nombre, contacto, resumen, experiencia, proyectos, skills, educación.
- Mismo tema Tokyo Night pero en layout legible.
- Botón flotante "Volver al terminal" arriba.
- Imprimible (CSS `@media print`).

## Easter eggs (lista inicial)

- `sudo` → pide password, da pista en EN o ES.
- `rm -rf /` → animación + "obviamente no".
- `exit` → "No puedes huir, esto es tu CV".
- `vim` / `emacs` → guerra santa en broma.
- `whoami` con reconocimiento de bots/crawlers → mensaje específico para Googlebot, GPTBot, etc.
- Konami code → cambia el tema temporalmente a "rainbow" 🌈.

## Mockup de referencia aprobado

El usuario validó el mockup mostrado en chat el 2026-06-24. Ese render es la **referencia visual canónica** para `frontend-dev` cuando llegue Fase 2:
- Header tipo navegador con 3 puntitos (rojo/amarillo/verde) + texto atenuado `notpelos.pages.dev` + botón `👔 recruiter` en azul Tokyo Night, esquina superior derecha.
- Banner ASCII inicial centrado en azul `#7aa2f7`, bordeado con caracteres `╔═╗ ║ ╚═╝`.
- Prompt: `notpelos@cv` (azul) + `:` (gris) + `~` (magenta) + `$` (gris) — los comandos del user en verde `#9ece6a`, args en gris claro.
- Salida de `ls`: nombres de archivo en azul; carpetas en cyan `#7dcfff`; ocultos (`.secrets/`) en gris atenuado `#565f89`.
- Salida de `cat`: párrafos en `#c0caf5`, palabras-clave técnicas resaltadas en magenta `#bb9af7`, citas irónicas en rojo `#f7768e`, marcas (empresa actual) en cyan.
- Cursor `█` parpadeando a 530 ms, color `#c0caf5`.
- Barra inferior con chips de comandos sugeridos (solo aparecerán en móvil en producción; en desktop fue ilustrativa).
- Vista recruiter: misma paleta, layout vertical de una columna, headings en mayúsculas tracking ancho en azul `#7aa2f7`, fechas en `#565f89`, empresas en magenta, stack como pills bordeados de gris `#414868`.

## Decisiones cerradas (pulido visual)

### Layout pantalla inicial
Terminal full-screen sin chrome. Esquina superior izquierda: `notpelos@cv:~$` discreto. Esquina superior derecha: icono `👔` de 15px que ejecuta `recruiter`. Centrado: banner ASCII de bienvenida + prompt parpadeante debajo.

### Tipografía
- **JetBrains Mono 400 regular**
- Tamaño base: 15 px desktop / 13 px móvil
- Line-height: 1.5
- Ligaduras activadas (`==`, `=>`, `!=`, etc.)

### Cursor
`█` bloque sólido. Parpadeo a **530 ms** (clásico xterm).

### Animación de texto
- **Banner inicial y respuestas largas** (`neofetch`, `cat <md>`): efecto máquina de escribir a ~15 ms/char.
- **Input del usuario**: nunca animado, aparece instantáneo.
- **Respuestas cortas** (errores, `pwd`, `whoami`): instantáneas.

### Sonido
- Por defecto: **OFF**.
- Comandos `sound on` / `sound off` para alternar.
- Sample sutil (no la lotería).
- Persistencia en localStorage.

### `neofetch` — formato

```
              ████  notpelos@curriculum
             ██████ ───────────────────
            ████████  OS:       BackendDev Linux 5.x
           ██████████ Host:     Spain
          ████████████ Kernel:  Java 21.0.x
         ██████████████ Uptime: 5 años en backend
        ██████████████  Shell:  Spring Boot 3
       ████████████████ Top langs: Java 65% · Python 20% · TS 15%
       ████████████████ Repos:    XX públicos
        ██████████████  Coffee:   ████████████░ 92%
         ████████████   Vim/Emacs: vim ofc
```

ASCII art: silueta estilizada del logo de Java. Stats dinámicas vía GitHub API donde sea posible (top langs, número de repos). Resto inyectado desde `CONTENT.md`.

### Vista recruiter (`/cv`)
- Una columna, `max-width: 720 px`, centrado.
- **Sin foto** (evita sesgos; el avatar de GitHub ya cumple).
- Estructura vertical: nombre + título + contacto (sticky) → resumen → experiencia (timeline vertical) → 3 proyectos destacados como cards → skills (barras) → educación → certificaciones.
- Botón `← Back to terminal` flotante arriba izquierda.
- Mismo Tokyo Night, más espacio respiratorio.
- `@media print`: fondo blanco, tinta negra, imprimible directo.

### Logo / favicon
`>_` en `#7aa2f7` (azul Tokyo Night). Favicon SVG escalable. Mismo wordmark en barra superior.

### Móvil
- Chips de comandos sugeridos en barra fija abajo: `help`, `ls`, `cd ..`, `recruiter`.
- Solo visibles en viewports < 768 px y solo cuando el input tiene foco.
- Tap → **inserta** el comando en el input (no lo ejecuta), para que el usuario pueda completarlo o añadir args.

### Easter egg Konami
Código: `↑↑↓↓←→←→BA`. Efecto: **modo Matrix** — lluvia de caracteres verdes detrás del terminal durante 10 s, con sonido sutil (respeta el toggle `sound`).
