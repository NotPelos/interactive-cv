package dev.notpelos.cv.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Loads CV content from classpath resources under content/.
 *
 * Content files live in src/main/resources/content/ and are packaged into the JAR.
 * A sync script (apps/api/scripts/sync-content.sh) copies from apps/web/src/content/
 * if the web project defines canonical content there. For MVP, content is maintained
 * directly in the resources directory.
 *
 * Returns a CvData record populated with hardcoded structured data derived from CONTENT.md.
 * Markdown about text is read from classpath files; structured data (experience, skills, etc.)
 * is defined inline to avoid a full MD parser for table/YAML content — commonmark parses
 * paragraph text but not YAML front-matter, so structured sections use records directly.
 */
@Service
public class ContentLoader {

    private static final Logger log = LoggerFactory.getLogger(ContentLoader.class);

    public CvData load(String lang) {
        String resolvedLang = "en".equals(lang) ? "en" : "es";
        String about = loadAbout(resolvedLang);
        return buildCvData(resolvedLang, about);
    }

    private String loadAbout(String lang) {
        String path = "content/about." + lang + ".md";
        try {
            ClassPathResource resource = new ClassPathResource(path);
            return resource.getContentAsString(StandardCharsets.UTF_8).strip();
        } catch (IOException e) {
            log.warn("Could not load about content for lang={}: {}", lang, e.getMessage());
            return "";
        }
    }

    private CvData buildCvData(String lang, String about) {
        boolean isEs = "es".equals(lang);

        CvData.Identity identity = new CvData.Identity(
            "Ismael Sánchez Aguilera Repullo",
            "NotPelos",
            isEs
                ? "Desarrollador Backend · Java · Spring Boot · Microservicios"
                : "Backend Developer · Java · Spring Boot · Microservices",
            "ismaelprr10@gmail.com",
            isEs ? "Mairena del Aljarafe, Sevilla, España" : "Mairena del Aljarafe, Seville, Spain",
            "https://github.com/NotPelos",
            "https://www.linkedin.com/in/ismael-sanchez-aguilera-repullo/"
        );

        List<CvData.Highlight> highlights = isEs
            ? List.of(
                new CvData.Highlight(1, "−25 % de deuda técnica liderando la modernización Java legacy en Softtek"),
                new CvData.Highlight(2, "99,9 % de uptime sostenido en producción durante 2 años"),
                new CvData.Highlight(3, "−30 % errores de despliegue tras automatizar CI/CD con Jenkins"),
                new CvData.Highlight(4, "Conciliación de datos Snowflake ↔ DB2 para reporting de Inditex")
            )
            : List.of(
                new CvData.Highlight(1, "−25 % technical debt leading the Java legacy modernisation at Softtek"),
                new CvData.Highlight(2, "99.9 % sustained production uptime over 2 years"),
                new CvData.Highlight(3, "−30 % deployment errors after automating CI/CD with Jenkins"),
                new CvData.Highlight(4, "Snowflake ↔ DB2 data reconciliation for Inditex reporting")
            );

        List<CvData.Experience> experience = isEs
            ? buildExperienceEs()
            : buildExperienceEn();

        List<CvData.Project> projects = isEs
            ? buildProjectsEs()
            : buildProjectsEn();

        List<CvData.SkillGroup> skills = buildSkills();

        List<CvData.Education> education = List.of(
            new CvData.Education("2015", "I.E.S Jándula, Andújar", "Bachillerato"),
            new CvData.Education("2015–2016", "Universidad de Jaén",
                isEs ? "Ingeniería Informática (cambio de rumbo)" : "Computer Engineering (changed direction)"),
            new CvData.Education("2016–2019", "IES Francisco de los Ríos, Fernán Núñez",
                isEs ? "Técnico Superior en DAM" : "Higher Technician in Multiplatform Application Development"),
            new CvData.Education("2020–2021", "IES Ángel de Saavedra, Córdoba",
                isEs ? "CFGS Diseño de Videojuegos" : "Higher Certificate in Videogame Design")
        );

        return new CvData(lang, identity, about, highlights, experience, projects, skills, education);
    }

    private List<CvData.Experience> buildExperienceEs() {
        return List.of(
            new CvData.Experience(
                "Aubay · cliente Accenture",
                "Software Developer",
                "Nov 2025 → presente · Sevilla (remoto)",
                "Java, Spring Boot, Kafka",
                List.of(
                    "Desarrollo de nuevas funcionalidades sobre la plataforma de microservicios Java/Spring Boot del cliente.",
                    "Diseño y consumo de tópicos Kafka para flujos asíncronos entre dominios."
                )
            ),
            new CvData.Experience(
                "Luca-TIC · cliente Accenture",
                "Application Support Analyst",
                "Feb 2025 → Nov 2025 · Sevilla",
                "Java, Spring Boot, Angular, Node.js, Kafka, Kibana, Jenkins, PostgreSQL, MongoDB",
                List.of(
                    "Cacé bugs de producción enterrados en logs de cuatro microservicios distintos.",
                    "Rediseño de tópicos y consumers de Apache Kafka para desacoplar servicios.",
                    "Investigación de incidentes con Kibana y pipelines de Jenkins."
                )
            ),
            new CvData.Experience(
                "Softtek",
                "Software Developer",
                "Ene 2023 → Nov 2024 · Sevilla",
                "Java 8/11/17, Spring Boot, arquitectura hexagonal, Kafka, Jenkins, Snowflake, DB2, Docker, Grafana",
                List.of(
                    "Lideré la migración de bases de código legacy a Java 8/11/17 con arquitectura hexagonal — deuda técnica reducida un 25 %.",
                    "Automaticé pipelines CI/CD con Jenkins — −30 % de errores de despliegue.",
                    "Soporte N1/N2 con análisis de logs en Grafana — 99,9 % de uptime sostenido.",
                    "Conciliación de datos Snowflake ↔ DB2 para reporting empresarial de Inditex."
                )
            ),
            new CvData.Experience(
                "Minsait (Indra)",
                "Software Technician",
                "Sep 2022 → Ene 2023 · Sevilla",
                "Java, Spring Boot microservicios",
                List.of(
                    "Full-stack Java + Spring Boot microservicios; integración front-back sin fricción.",
                    "Resolución de bugs críticos: errores del sistema −15 %; tiempos de respuesta clave −20 %."
                )
            ),
            new CvData.Experience(
                "Ayesa",
                "Junior Developer",
                "Jul 2022 → Sep 2022 · Sevilla",
                "Java, SQL",
                List.of(
                    "Desarrollo Java con foco en code reviews y consultas SQL optimizadas.",
                    "−15 % bugs post-release, −20 % tiempo de entrega del proyecto."
                )
            ),
            new CvData.Experience(
                "NTT DATA Europe & LATAM",
                "Junior Developer",
                "Nov 2021 → May 2022 · Málaga",
                "Java, testing automatizado",
                List.of(
                    "Implementé protocolos de testing automatizado — +30 % de eficiencia en el ciclo de pruebas.",
                    "Troubleshooting técnico que liberaba al resto del equipo para foco en features."
                )
            )
        );
    }

    private List<CvData.Experience> buildExperienceEn() {
        return List.of(
            new CvData.Experience(
                "Aubay · Accenture client",
                "Software Developer",
                "Nov 2025 → present · Seville (remote)",
                "Java, Spring Boot, Kafka",
                List.of(
                    "Building new features on the client's Java/Spring Boot microservices platform.",
                    "Designing and consuming Kafka topics for async cross-domain flows."
                )
            ),
            new CvData.Experience(
                "Luca-TIC · Accenture client",
                "Application Support Analyst",
                "Feb 2025 → Nov 2025 · Seville",
                "Java, Spring Boot, Angular, Node.js, Kafka, Kibana, Jenkins, PostgreSQL, MongoDB",
                List.of(
                    "Tracked production bugs buried in logs across four different microservices.",
                    "Redesigned Apache Kafka topics and consumers to decouple services.",
                    "Incident investigation with Kibana and Jenkins pipelines."
                )
            ),
            new CvData.Experience(
                "Softtek",
                "Software Developer",
                "Jan 2023 → Nov 2024 · Seville",
                "Java 8/11/17, Spring Boot, hexagonal arch, Kafka, Jenkins, Snowflake, DB2, Docker, Grafana",
                List.of(
                    "Led legacy codebase migration to Java 8/11/17 with hexagonal architecture — technical debt down 25 %.",
                    "Automated CI/CD pipelines with Jenkins — −30 % deploy errors.",
                    "N1/N2 production support with Grafana log analysis — sustained 99.9 % uptime.",
                    "Snowflake ↔ DB2 data reconciliation with advanced SQL for Inditex enterprise reporting."
                )
            ),
            new CvData.Experience(
                "Minsait (Indra)",
                "Software Technician",
                "Sep 2022 → Jan 2023 · Seville",
                "Java, Spring Boot microservices",
                List.of(
                    "Full-stack Java + Spring Boot microservices; clean front-back integration.",
                    "Critical bug fixes: system errors down 15 %, key feature response times down 20 %."
                )
            ),
            new CvData.Experience(
                "Ayesa",
                "Junior Developer",
                "Jul 2022 → Sep 2022 · Seville",
                "Java, SQL",
                List.of(
                    "Java development with strong focus on code review and optimised SQL queries.",
                    "−15 % post-release bugs, −20 % project delivery time."
                )
            ),
            new CvData.Experience(
                "NTT DATA Europe & LATAM",
                "Junior Developer",
                "Nov 2021 → May 2022 · Málaga",
                "Java, automated testing",
                List.of(
                    "Set up automated testing protocols — +30 % testing efficiency.",
                    "Tech troubleshooting that freed the rest of the team to focus on features."
                )
            )
        );
    }

    private List<CvData.Project> buildProjectsEs() {
        return List.of(
            new CvData.Project(
                "AuthServiceGame",
                "Tracker de tiempo de juego en microservicios.",
                "https://github.com/NotPelos/AuthServiceGame",
                "Java · Spring Boot · JWT/OAuth2",
                "Sistema de microservicios para que un gamer mida cuánto juega, fije objetivos y compare evolución entre títulos. JWT/OAuth2, tracking de sesiones, alertas de descanso."
            ),
            new CvData.Project(
                "Discord-Bot",
                "Moderación automatizada para servidores FiveM RP.",
                "https://github.com/NotPelos/Discord-Bot",
                "Python · discord.py",
                "Bot que administra servidores de rol en FiveM: RBAC con colores hex personalizados, moderación automática, mensajes embebidos."
            ),
            new CvData.Project(
                "robo_contenedores",
                "Mecánicas de atraco para GTA V multiplayer.",
                "https://github.com/NotPelos/robo_contenedores",
                "LUA · JavaScript · HTML · CSS",
                "Scripts custom para FiveM. Backend LUA optimizado para servidores con muchos jugadores en concurrencia; mini-juego embebido en JS/HTML/CSS."
            ),
            new CvData.Project(
                "ProductService",
                "Inventario para pequeños negocios.",
                "https://github.com/NotPelos/ProductService",
                "Java · Spring Boot",
                "Backend de inventario con CRUD de productos, proveedores y clientes, registro de ventas/compras con actualización automática de stock."
            ),
            new CvData.Project(
                "Curriculum (este proyecto)",
                "El CV que estás leyendo, demostrado en su propio código.",
                "https://github.com/NotPelos",
                "Astro · TS · Tailwind · Spring Boot · Cloudflare",
                "Terminal interactivo Tokyo Night + microservicio Java sirviendo el PDF + Cloudflare Worker cacheando la GitHub API. Todo en free tier."
            )
        );
    }

    private List<CvData.Project> buildProjectsEn() {
        return List.of(
            new CvData.Project(
                "AuthServiceGame",
                "Playtime tracker in microservices.",
                "https://github.com/NotPelos/AuthServiceGame",
                "Java · Spring Boot · JWT/OAuth2",
                "Microservices system for gamers to track playtime, set goals, and compare progress across titles. JWT/OAuth2, session tracking, break alerts."
            ),
            new CvData.Project(
                "Discord-Bot",
                "Automated moderation for FiveM RP servers.",
                "https://github.com/NotPelos/Discord-Bot",
                "Python · discord.py",
                "Bot managing FiveM role-play servers: RBAC with custom hex colour roles, automated moderation, rich-embed messaging."
            ),
            new CvData.Project(
                "robo_contenedores",
                "Heist mechanics for GTA V multiplayer.",
                "https://github.com/NotPelos/robo_contenedores",
                "LUA · JavaScript · HTML · CSS",
                "Custom FiveM scripts. Performance-tuned LUA backend for high-concurrency servers; embedded JS/HTML/CSS mini-game."
            ),
            new CvData.Project(
                "ProductService",
                "Inventory system for small businesses.",
                "https://github.com/NotPelos/ProductService",
                "Java · Spring Boot",
                "Inventory backend with product/supplier/customer CRUD, sales & purchase logging with auto stock updates."
            ),
            new CvData.Project(
                "Curriculum (this project)",
                "The CV you're reading, demonstrated in its own code.",
                "https://github.com/NotPelos",
                "Astro · TS · Tailwind · Spring Boot · Cloudflare",
                "Tokyo Night interactive terminal + Java microservice serving the PDF + Cloudflare Worker caching the GitHub API. All on free tiers."
            )
        );
    }

    private List<CvData.SkillGroup> buildSkills() {
        return List.of(
            new CvData.SkillGroup("Languages", List.of(
                new CvData.SkillEntry("Java", 5),
                new CvData.SkillEntry("SQL", 4),
                new CvData.SkillEntry("Python", 3),
                new CvData.SkillEntry("JavaScript", 3),
                new CvData.SkillEntry("Lua", 3),
                new CvData.SkillEntry("TypeScript", 2)
            )),
            new CvData.SkillGroup("Frameworks", List.of(
                new CvData.SkillEntry("Spring Boot", 5),
                new CvData.SkillEntry("Spring Cloud", 4),
                new CvData.SkillEntry("Angular", 3),
                new CvData.SkillEntry("Node.js", 3)
            )),
            new CvData.SkillGroup("Infrastructure", List.of(
                new CvData.SkillEntry("Git", 5),
                new CvData.SkillEntry("Docker", 4),
                new CvData.SkillEntry("Jenkins", 4),
                new CvData.SkillEntry("Kafka", 4),
                new CvData.SkillEntry("Kibana", 4),
                new CvData.SkillEntry("Linux", 4),
                new CvData.SkillEntry("Kubernetes", 3)
            )),
            new CvData.SkillGroup("Databases", List.of(
                new CvData.SkillEntry("PostgreSQL", 4),
                new CvData.SkillEntry("MongoDB", 3),
                new CvData.SkillEntry("DB2", 3),
                new CvData.SkillEntry("Snowflake", 3)
            ))
        );
    }
}
