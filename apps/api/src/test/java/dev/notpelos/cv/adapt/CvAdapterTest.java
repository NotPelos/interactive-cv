package dev.notpelos.cv.adapt;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests para CvAdapter (Gemini mocked).
 *
 * Cubre el path del clamp defensivo: LLM devuelve índices fuera de rango o
 * duplicados, y el adapter los sanea antes de pasarlos al frontend.
 */
class CvAdapterTest {

    private GeminiClient gemini;
    private CvAdapter adapter;

    @BeforeEach
    void setup() {
        gemini = mock(GeminiClient.class);
        adapter = new CvAdapter(gemini, new ObjectMapper());
    }

    private AdaptRequest.CvPayload sampleCv() {
        return new AdaptRequest.CvPayload(
            "es",
            "Sobre mí de ejemplo.",
            List.of(
                new AdaptRequest.Highlight("−25%", "deuda técnica"),
                new AdaptRequest.Highlight("99.9%", "uptime"),
                new AdaptRequest.Highlight("−30%", "errores deploy")
            ),
            List.of(
                new AdaptRequest.Experience("Aubay", "Software Dev", "2025→", List.of("Java"), List.of("bullet1")),
                new AdaptRequest.Experience("Softtek", "Software Dev", "2023→24", List.of("Java"), List.of("bullet1"))
            ),
            List.of(
                new AdaptRequest.Project("Finanzas", "pitch", List.of("React")),
                new AdaptRequest.Project("CV", "pitch", List.of("Astro"))
            ),
            Map.of("languages", Map.of("java", 5))
        );
    }

    @Test
    void adapt_usaSystemInstructionSegunLang() {
        AdaptRequest req = new AdaptRequest("Descripción del puesto…" + "x".repeat(100), sampleCv());
        AdaptResponse mocked = new AdaptResponse(List.of(0), List.of(0), List.of(0), List.of("Java"), "OK", 80);
        when(gemini.generateStructured(anyString(), anyString(), any(), eq(AdaptResponse.class))).thenReturn(mocked);

        adapter.adapt(req);

        ArgumentCaptor<String> systemCap = ArgumentCaptor.forClass(String.class);
        verify(gemini).generateStructured(systemCap.capture(), anyString(), any(), eq(AdaptResponse.class));
        String system = systemCap.getValue();
        // ES por defecto
        assertTrue(system.contains("Eres un asesor de carrera"), "expected ES system instruction");
    }

    @Test
    void adapt_clampeaIndicesFueraDeRango() {
        AdaptResponse llmSaidTooMuch = new AdaptResponse(
            List.of(0, 5, 99),          // 5 y 99 fuera de rango (solo 3 highlights)
            List.of(0, 1, 2),           // 2 fuera de rango (solo 2 experience)
            List.of(0, 1),
            List.of("Java", "Spring", "Kafka", "Docker", "Jenkins", "Grafana", "Kibana", "Kubernetes", "Extra"),
            "test",
            150                          // fuera de 0-100
        );
        when(gemini.generateStructured(anyString(), anyString(), any(), eq(AdaptResponse.class)))
            .thenReturn(llmSaidTooMuch);

        AdaptResponse r = adapter.adapt(new AdaptRequest("desc" + "x".repeat(100), sampleCv()));

        // Highlights: max 3, solo 0 es válido
        assertEquals(List.of(0), r.relevantHighlights());
        // Experience: solo 0 y 1 son válidos (2 fuera de rango)
        assertEquals(List.of(0, 1), r.relevantExperience());
        // Projects: dentro de rango, sin clamp
        assertEquals(List.of(0, 1), r.relevantProjects());
        // Skills: cap a 8
        assertEquals(8, r.relevantSkills().size());
        // matchScore clamp
        assertEquals(100, r.matchScore());
    }

    @Test
    void adapt_toleraArraysNull() {
        AdaptResponse withNulls = new AdaptResponse(null, null, null, null, "summary", 50);
        when(gemini.generateStructured(anyString(), anyString(), any(), eq(AdaptResponse.class))).thenReturn(withNulls);

        AdaptResponse r = adapter.adapt(new AdaptRequest("desc" + "x".repeat(100), sampleCv()));

        assertNotNull(r.relevantHighlights());
        assertTrue(r.relevantHighlights().isEmpty());
        assertTrue(r.relevantExperience().isEmpty());
        assertTrue(r.relevantProjects().isEmpty());
        assertTrue(r.relevantSkills().isEmpty());
        assertEquals("summary", r.customSummary());
    }
}
