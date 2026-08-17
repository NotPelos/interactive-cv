package dev.notpelos.cv.adapt;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;

/**
 * Cliente minimal para la Gemini API (generativeLanguage).
 *
 * Modelo: gemini-2.0-flash — free tier 15 RPM / 1500 RPD, más que suficiente
 * para el adapter del CV. Structured output vía `response_mime_type=application/json`.
 * Ver https://ai.google.dev/gemini-api/docs/structured-output
 *
 * Fail-closed: sin GEMINI_API_KEY configurada, adapt() lanza. El controller
 * lo traduce a 502.
 */
@Service
public class GeminiClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);
    private static final String MODEL = "gemini-2.0-flash";
    private static final String ENDPOINT_TEMPLATE =
        "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";
    private static final Duration TIMEOUT = Duration.ofSeconds(30);

    private final WebClient webClient;
    private final ObjectMapper mapper;
    private final String apiKey;

    public GeminiClient(
        WebClient.Builder webClientBuilder,
        ObjectMapper mapper,
        @Value("${gemini.api-key:}") String apiKey
    ) {
        // Buffer max ampliado a 2MB para respuestas largas del modelo.
        this.webClient = webClientBuilder
            .codecs(c -> c.defaultCodecs().maxInMemorySize(2 * 1024 * 1024))
            .build();
        this.mapper = mapper;
        this.apiKey = apiKey;
    }

    /**
     * Llama a Gemini y devuelve el texto JSON generado (según responseSchema).
     * El caller es responsable de parsear ese JSON al tipo esperado.
     */
    public String generateJson(String systemInstruction, String userPrompt, Object responseSchema) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("gemini_api_key_missing");
        }

        GeminiRequest req = new GeminiRequest(
            List.of(new Content("user", List.of(new Part(userPrompt)))),
            new SystemInstruction(List.of(new Part(systemInstruction))),
            new GenerationConfig("application/json", responseSchema, 0.3, 4096)
        );

        try {
            GeminiResponse resp = webClient.post()
                .uri(String.format(ENDPOINT_TEMPLATE, MODEL, apiKey))
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(req)
                .retrieve()
                .onStatus(HttpStatusCode::isError, r -> r.bodyToMono(String.class)
                    .defaultIfEmpty("")
                    .flatMap(body -> {
                        // Log solo status + primeras 200 chars del body para debug;
                        // nunca el prompt completo (podría contener info del CV).
                        String snippet = body.length() > 200 ? body.substring(0, 200) : body;
                        log.warn("gemini_error status={} body_snippet={}", r.statusCode().value(), snippet);
                        return Mono.error(new IllegalStateException(
                            "gemini_upstream_" + r.statusCode().value()));
                    }))
                .bodyToMono(GeminiResponse.class)
                .timeout(TIMEOUT)
                .block();

            if (resp == null || resp.candidates == null || resp.candidates.isEmpty()) {
                throw new IllegalStateException("gemini_empty_response");
            }
            Candidate first = resp.candidates.get(0);
            if (first.content == null || first.content.parts == null || first.content.parts.isEmpty()) {
                throw new IllegalStateException("gemini_no_content");
            }
            String text = first.content.parts.get(0).text;
            if (text == null || text.isBlank()) {
                throw new IllegalStateException("gemini_empty_text");
            }
            return text;
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            log.warn("gemini_call_failed: {}", e.getClass().getSimpleName());
            throw new IllegalStateException("gemini_call_failed", e);
        }
    }

    /** Convenience: parse el JSON de la respuesta al tipo indicado. */
    public <T> T generateStructured(String systemInstruction, String userPrompt, Object responseSchema, Class<T> type) {
        String json = generateJson(systemInstruction, userPrompt, responseSchema);
        try {
            return mapper.readValue(json, type);
        } catch (JsonProcessingException e) {
            log.warn("gemini_response_parse_failed json_len={}", json.length());
            throw new IllegalStateException("gemini_response_parse_failed", e);
        }
    }

    // ---- Gemini payload shapes (subset) ----

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private record GeminiRequest(
        List<Content> contents,
        @JsonProperty("systemInstruction") SystemInstruction systemInstruction,
        @JsonProperty("generationConfig") GenerationConfig generationConfig
    ) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private record Content(String role, List<Part> parts) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private record SystemInstruction(List<Part> parts) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private record Part(String text) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private record GenerationConfig(
        @JsonProperty("responseMimeType") String responseMimeType,
        @JsonProperty("responseSchema") Object responseSchema,
        Double temperature,
        @JsonProperty("maxOutputTokens") Integer maxOutputTokens
    ) {}

    // ---- Gemini response shape (mutable classes for Jackson deserialization) ----

    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
    private static class GeminiResponse {
        public List<Candidate> candidates;
    }

    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
    private static class Candidate {
        public ResponseContent content;
    }

    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
    private static class ResponseContent {
        public List<ResponsePart> parts;
    }

    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
    private static class ResponsePart {
        public String text;
    }
}
