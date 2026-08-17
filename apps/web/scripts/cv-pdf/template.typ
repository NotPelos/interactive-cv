// Plantilla CV neutra con sidebar. Recibe todo el contexto via `data`
// (JSON cargado por main.typ) y las etiquetas i18n via `labels`.
//
// Diseño: A4, dos columnas fijas (sidebar 34% / main 66%), acento azul discreto.
// Sin colores fuertes, sin iconos raros — pensado para reclutadores no-devs.

#let ACCENT = rgb(37, 99, 175)          // azul discreto (tailwind blue-700)
#let INK = rgb(30, 41, 59)              // slate-800
#let INK_MUTED = rgb(71, 85, 105)       // slate-600
#let INK_LIGHT = rgb(148, 163, 184)     // slate-400
#let SIDEBAR_BG = rgb(248, 250, 252)    // slate-50
#let DIVIDER = rgb(226, 232, 240)       // slate-200

// -------- helpers de sección --------

#let sidebar-h(title) = block(
  above: 12pt,
  below: 4pt,
  text(
    size: 8.5pt,
    weight: 700,
    tracking: 1.2pt,
    upper(title),
    fill: ACCENT,
  ),
)

#let main-h(title) = block(
  above: 14pt,
  below: 6pt,
  {
    text(size: 11pt, weight: 700, tracking: 0.8pt, upper(title), fill: ACCENT)
    v(2pt)
    line(length: 100%, stroke: 0.6pt + DIVIDER)
  },
)

// -------- experiencia / proyectos --------

#let experience-item(item, labels) = block(
  above: 12pt,
  below: 8pt,
  breakable: false,
  {
    // header line: role @ company · client (opt)
    text(size: 10.5pt, weight: 700, item.role, fill: INK)
    text(size: 10.5pt, weight: 400, fill: INK_MUTED, [ · #item.company])
    if "client" in item and item.client != none {
      text(size: 9.5pt, weight: 400, fill: INK_LIGHT, [ · #labels.client #item.client])
    }
    linebreak()
    // meta: dates · location
    text(size: 9pt, fill: INK_MUTED, item.dateRange)
    if item.location != none and item.location != "" {
      text(size: 9pt, fill: INK_MUTED, [ · #item.location])
    }
    // stack en línea propia con un pelín de aire arriba
    if item.stack != none and item.stack.len() > 0 {
      v(1pt)
      text(size: 8.5pt, fill: INK_LIGHT, item.stack.join(" · "))
    }
    v(4pt)
    // Bullets: lista nativa con hanging indent (continuation lines quedan
    // alineadas después del marker) y separación decente entre items.
    // set list dentro del bloque para no contaminar el resto del doc.
    set list(
      marker: text(fill: INK_MUTED, "•"),
      indent: 0pt,
      body-indent: 6pt,
      spacing: 5pt,
    )
    set par(leading: 0.55em, spacing: 5pt)
    text(size: 9.5pt, fill: INK, {
      for line in item.bullets {
        list.item(eval(line, mode: "markup"))
      }
    })
  },
)

#let project-item(item) = block(
  above: 6pt,
  below: 4pt,
  breakable: false,
  {
    text(size: 10.5pt, weight: 700, item.title, fill: INK)
    if item.pitch != none and item.pitch != "" {
      text(size: 9.5pt, fill: INK_MUTED, [ — #item.pitch])
    }
    linebreak()
    if item.stack != none and item.stack.len() > 0 {
      text(size: 8.5pt, fill: INK_LIGHT, item.stack.join(" · "))
      linebreak()
    }
    if item.link != none and item.link != "" {
      text(size: 8.5pt, fill: ACCENT, link(item.link, item.link))
    }
  },
)

// -------- entry point --------

#let cv(data, labels) = {
  set page(
    paper: "a4",
    margin: (top: 0cm, bottom: 0cm, left: 0cm, right: 0cm),
  )
  set text(
    // Inter viene bundleado en scripts/cv-pdf/fonts/, garantizando render
    // determinístico local↔CI. Sin fallback: si Inter falta, mejor romper.
    font: "Inter",
    size: 10pt,
    fill: INK,
    lang: labels.lang,
  )
  set par(justify: false, leading: 0.55em)
  // Los links con guiones (LinkedIn handles, repos con dashes) deben partir
  // sin insertar un guion extra al hacer wrap. `hyphenate: false` heredado
  // por text no baja hasta el link() — hace falta reafirmarlo aquí.
  show link: it => text(fill: ACCENT, hyphenate: false, it)

  grid(
    columns: (34%, 1fr),
    // ================= SIDEBAR =================
    block(
      fill: SIDEBAR_BG,
      width: 100%,
      height: 100%,
      inset: (x: 18pt, y: 22pt),
      {
        // URLs y skills largos no deben partir en guiones — hyphenation off
        // en todo el sidebar. Wrapping natural sí (el texto salta a la línea
        // siguiente sin insertar guiones que se lean como "typo").
        set text(hyphenate: false)
        // Foto circular
        if data.hasAvatar {
          align(center)[
            #box(
              radius: 100%,
              clip: true,
              width: 120pt,
              height: 120pt,
              image(data.avatarPath, width: 120pt, height: 120pt, fit: "cover"),
            )
          ]
          v(8pt)
        }

        // Nombre
        align(center, text(
          size: 16pt,
          weight: 700,
          fill: INK,
          data.fullName,
        ))
        v(2pt)
        // Título/rol
        align(center, text(
          size: 10pt,
          fill: INK_MUTED,
          data.role,
        ))

        sidebar-h(labels.contact)
        stack(
          spacing: 3pt,
          text(size: 8.5pt, fill: INK, data.email),
          text(size: 8.5pt, fill: INK, data.location),
          text(size: 8.5pt, fill: ACCENT, link(data.githubUrl, data.githubDisplay)),
          text(size: 8.5pt, fill: ACCENT, link(data.linkedinUrl, data.linkedinDisplay)),
        )

        sidebar-h(labels.languages)
        text(size: 9pt, fill: INK, data.skills.languages.join(" · "))

        sidebar-h(labels.frameworks)
        text(size: 9pt, fill: INK, data.skills.frameworks.join(" · "))

        sidebar-h(labels.infra)
        text(size: 9pt, fill: INK, data.skills.infra.join(" · "))

        sidebar-h(labels.databases)
        text(size: 9pt, fill: INK, data.skills.databases.join(" · "))

        sidebar-h(labels.methods)
        text(size: 9pt, fill: INK, data.skills.methods.join(" · "))

        sidebar-h(labels.spoken)
        stack(
          spacing: 2pt,
          text(size: 9pt, fill: INK, labels.spanishNative),
          text(size: 9pt, fill: INK, labels.englishProfessional),
        )
      },
    ),

    // ================= MAIN =================
    block(
      width: 100%,
      inset: (x: 22pt, y: 22pt),
      {
        // -------- Perfil --------
        main-h(labels.profile)
        for paragraph in data.about {
          block(
            above: 3pt,
            below: 5pt,
            text(size: 9.5pt, fill: INK, eval(paragraph, mode: "markup")),
          )
        }

        // -------- Highlights --------
        // Grid con tantas columnas como highlights hay (top-3 → 3 col,
        // top-4 → 2×2). Evita el slot vacío feo en el bloque simétrico.
        if data.highlights.len() > 0 {
          main-h(labels.highlights)
          let n = data.highlights.len()
          let cols = if n <= 3 { n } else { 2 }
          grid(
            columns: (1fr,) * cols,
            column-gutter: 8pt,
            row-gutter: 6pt,
            ..data.highlights.map(h => block(
              inset: 6pt,
              stroke: 0.5pt + DIVIDER,
              radius: 3pt,
              {
                text(size: 13pt, weight: 700, fill: ACCENT, h.metric)
                v(2pt)
                text(size: 8.5pt, fill: INK_MUTED, h.label)
              },
            )),
          )
        }

        // -------- Experiencia --------
        main-h(labels.experience)
        for item in data.experience {
          experience-item(item, labels)
        }

        // -------- Proyectos --------
        main-h(labels.projects)
        for item in data.projects {
          project-item(item)
        }

        // -------- Educación --------
        // Bloque no rompible: si no cabe entera al final de la página anterior,
        // se lleva toda a la siguiente en vez de dejar una fila huérfana.
        main-h(labels.education)
        block(
          breakable: false,
          {
            for row in data.education.rows {
              block(
                above: 5pt,
                below: 5pt,
                {
                  text(size: 9pt, fill: INK_MUTED, row.year)
                  text(size: 9.5pt, weight: 700, fill: INK, [  #row.school])
                  linebreak()
                  text(size: 9pt, fill: INK_MUTED, row.title)
                },
              )
            }
            // Secciones adicionales del md (Bootcamps, Otros, etc.)
            for section in data.education.sections {
              v(8pt)
              text(
                size: 9pt,
                weight: 700,
                tracking: 0.6pt,
                fill: INK,
                upper(section.title),
              )
              v(4pt)
              set list(
                marker: text(fill: INK_MUTED, "•"),
                indent: 0pt,
                body-indent: 6pt,
                spacing: 4pt,
              )
              text(size: 9pt, fill: INK, {
                for b in section.bullets {
                  list.item(eval(b, mode: "markup"))
                }
              })
            }
          },
        )
      },
    ),
  )
}
