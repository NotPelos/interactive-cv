package dev.notpelos.cv.adapt;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Lógica de adaptación del CV a una descripción de puesto.
 *
 * Estrategia:
 *   1. Serializar el CV a JSON compacto.
 *   2. Prompt al LLM con instrucciones estrictas: devolver ÍNDICES y una razón
 *      corta, nada más.
 *   3. `responseSchema` fuerza a Gemini a devolver JSON con la forma correcta.
 *   4. Deserializar → AdaptResponse.
 *
 * No hacemos post-procesado sobre el texto libre — el prompt ya pide 2-4 frases
 * y el schema tiene maxLength. Si el LLM se pasa, Gemini lo trunca antes de
 * responder.
 */
@Service
public class CvAdapter {

    private static final Logger log = LoggerFactory.getLogger(CvAdapter.class);

    private static final String SYSTEM_INSTRUCTION_ES = """
        Eres un asesor de carrera experto. Analizas un CV y una descripción de puesto \
        y devuelves QUÉ partes del CV son más relevantes para ese puesto.

        Devuelves SIEMPRE JSON con esta forma exacta (indices 0-based, no texto):
          - relevantHighlights: array de indices de highlights (0 a N-1) que mejor \
            demuestran encaje con el puesto. Máximo 3.
          - relevantExperience: array de indices de experiencia laboral que mejor \
            encaja con las responsabilidades del puesto. Máximo 3.
          - relevantProjects: array de indices de proyectos que mejor demuestran las \
            habilidades pedidas. Máximo 4.
          - relevantSkills: array de strings — los nombres CANÓNICOS de skills \
            (tal cual aparecen en el CV) que son crucialmente relevantes. Máximo 8.
          - customSummary: 2-4 frases en el mismo idioma del CV (`lang`) explicando \
            por qué este perfil encaja con este puesto concreto. Personal, sin \
            corporativo. Menciona 1-2 items específicos del CV.
          - matchScore: 0-100. 0=nada de encaje, 100=perfecto.

        Reglas:
          - NUNCA inventes items que no estén en el CV.
          - Si el puesto no encaja nada con el perfil, devuelve arrays vacíos y \
            matchScore < 30, y en customSummary di honestamente que no encaja.
          - Si el puesto está claramente en otro sector (marketing, sales) sobre un \
            perfil tech, marca <20 y explica el mismatch.
        """;

    private static final String SYSTEM_INSTRUCTION_EN = """
        You are an expert career advisor. Given a CV and a job description, you decide \
        WHICH parts of the CV are most relevant to that job.

        You ALWAYS return JSON with this exact shape (0-based indices, no free text):
          - relevantHighlights: array of highlight indices (0 to N-1) that best \
            show fit for the role. Max 3.
          - relevantExperience: array of experience indices that best match the \
            role's responsibilities. Max 3.
          - relevantProjects: array of project indices that best show the required \
            skills. Max 4.
          - relevantSkills: array of strings — the CANONICAL names of skills (as they \
            appear in the CV) that are crucially relevant. Max 8.
          - customSummary: 2-4 sentences in the CV's language (`lang`) explaining \
            why this candidate fits this specific role. Personal, not corporate. \
            Mention 1-2 concrete items from the CV.
          - matchScore: 0-100. 0 = no fit, 100 = perfect fit.

        Rules:
          - NEVER invent items that aren't in the CV.
          - If the role does not fit at all, return empty arrays, matchScore < 30, \
            and honestly say so in customSummary.
          - If the role is clearly in a different domain (marketing, sales) for a \
            tech profile, mark <20 and explain the mismatch.
        """;

    /**
     * responseSchema — subset del JSON Schema soportado por Gemini structured output.
     * Se pasa como Map porque el shape es fijo y estático; no vale la pena crear
     * records para algo que solo Gemini lee.
     */
    private static final Map<String, Object> RESPONSE_SCHEMA = Map.of(
        "type", "object",
        "properties", Map.of(
            "relevantHighlights", Map.of("type", "array", "items", Map.of("type", "integer")),
            "relevantExperience", Map.of("type", "array", "items", Map.of("type", "integer")),
            "relevantProjects", Map.of("type", "array", "items", Map.of("type", "integer")),
            "relevantSkills", Map.of("type", "array", "items", Map.of("type", "string")),
            "customSummary", Map.of("type", "string", "maxLength", 800),
            "matchScore", Map.of("type", "integer", "minimum", 0, "maximum", 100)
        ),
        "required", List.of(
            "relevantHighlights", "relevantExperience", "relevantProjects",
            "relevantSkills", "customSummary", "matchScore"
        )
    );

    private final GeminiClient gemini;
    private final ObjectMapper mapper;

    public CvAdapter(GeminiClient gemini, ObjectMapper mapper) {
        this.gemini = gemini;
        this.mapper = mapper;
    }

    public AdaptResponse adapt(AdaptRequest req) {
        String system = "en".equalsIgnoreCase(req.cv().lang())
            ? SYSTEM_INSTRUCTION_EN
            : SYSTEM_INSTRUCTION_ES;

        String userPrompt = buildUserPrompt(req);

        AdaptResponse result = gemini.generateStructured(
            system, userPrompt, RESPONSE_SCHEMA, AdaptResponse.class);

        // Clamp defensivo — el LLM puede ignorar los "max N" del prompt.
        return clamp(result, req.cv());
    }

    private String buildUserPrompt(AdaptRequest req) {
        String cvJson;
        try {
            cvJson = mapper.writeValueAsString(req.cv());
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("cv_serialization_failed", e);
        }
        // No PII log; solo el tamaño del prompt para debug.
        log.info("adapt_prompt built cv_json_chars={} job_desc_chars={}",
            cvJson.length(), req.jobDescription().length());

        return "CV (JSON):\n" + cvJson + "\n\n---\n\nJob description:\n" + req.jobDescription();
    }

    /**
     * Recorta los arrays si el LLM devolvió más de lo permitido o índices fuera
     * de rango. Defense-in-depth: nunca pasar al frontend un índice inválido.
     */
    private AdaptResponse clamp(AdaptResponse r, AdaptRequest.CvPayload cv) {
        List<Integer> h = safeIndices(r.relevantHighlights(), cv.highlights().size(), 3);
        List<Integer> e = safeIndices(r.relevantExperience(), cv.experience().size(), 3);
        List<Integer> p = safeIndices(r.relevantProjects(), cv.projects().size(), 4);
        List<String> s = r.relevantSkills() == null ? List.of()
            : r.relevantSkills().stream().limit(8).toList();
        int score = Math.max(0, Math.min(100, r.matchScore()));
        return new AdaptResponse(h, e, p, s, r.customSummary(), score);
    }

    private List<Integer> safeIndices(List<Integer> input, int max, int cap) {
        if (input == null) return List.of();
        return input.stream()
            .filter(i -> i != null && i >= 0 && i < max)
            .distinct()
            .limit(cap)
            .toList();
    }
}
