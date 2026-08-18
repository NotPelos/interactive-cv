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
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;

import java.time.Duration;
import java.util.List;
import java.util.Set;

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
    // Modelo principal: gemini-flash-latest (alias moving de Google al Flash actual,
    // evita fallos por deprecaciones cuando salen versiones nuevas).
    // Modelo fallback: gemini-flash-lite-latest — más pequeño, suele estar menos
    // congestionado. Se usa automáticamente si el principal devuelve 503 tras retries.
    private static final String MODEL_PRIMARY = "gemini-flash-latest";
    private static final String MODEL_FALLBACK = "gemini-flash-lite-latest";
    private static final String ENDPOINT_TEMPLATE =
        "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";
    // 60s para dar margen al "thinking" implícito de los modelos 2.5+/3.x cuando
    // el prompt es grande (nuestro CV+job description ≈ 10k chars).
    private static final Duration TIMEOUT = Duration.ofSeconds(60);
    // Statuses transitorios donde reintentar tiene sentido — el resto (400, 401,
    // 404) son errores nuestros o de configuración y no mejoran con retry.
    private static final Set<Integer> TRANSIENT_STATUSES = Set.of(429, 500, 502, 503, 504);

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
     * Con fallback al modelo lite si el principal está saturado (503) tras retries.
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
            return callModel(MODEL_PRIMARY, req);
        } catch (IllegalStateException e) {
            // Fallback solo si el principal está saturado (503). Otros errores
            // (400, 404, key inválida) NO se benefician de cambiar de modelo.
            if (e.getMessage() != null && e.getMessage().equals("gemini_upstream_503")) {
                log.info("gemini_primary_saturated using_fallback={}", MODEL_FALLBACK);
                return callModel(MODEL_FALLBACK, req);
            }
            throw e;
        }
    }

    private String callModel(String model, GeminiRequest req) {
        try {
            GeminiResponse resp = webClient.post()
                .uri(String.format(ENDPOINT_TEMPLATE, model, apiKey))
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(req)
                .retrieve()
                .onStatus(HttpStatusCode::isError, r -> r.bodyToMono(String.class)
                    .defaultIfEmpty("")
                    .flatMap(body -> {
                        String snippet = body.length() > 200 ? body.substring(0, 200) : body;
                        log.warn("gemini_error status={} body_snippet={}", r.statusCode().value(), snippet);
                        return Mono.error(new WebClientResponseException(
                            r.statusCode().value(),
                            "gemini_upstream_" + r.statusCode().value(),
                            r.headers().asHttpHeaders(), body.getBytes(), null));
                    }))
                .bodyToMono(GeminiResponse.class)
                .timeout(TIMEOUT)
                // Retry en 429/500/502/503/504 (transients). Backoff exponencial
                // desde 500ms para no martillar cuando Gemini está saturado.
                .retryWhen(Retry.backoff(2, Duration.ofMillis(500))
                    .filter(e -> e instanceof WebClientResponseException wcre
                        && TRANSIENT_STATUSES.contains(wcre.getStatusCode().value()))
                    .doBeforeRetry(sig -> log.info(
                        "gemini_retry attempt={} cause={}",
                        sig.totalRetries() + 1,
                        sig.failure() instanceof WebClientResponseException w ? w.getStatusCode().value() : "?")))
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
            // Reactor puede envolver el WebClientResponseException dentro de un
            // RetryExhaustedException tras agotar reintentos. Buscamos el WCRE
            // en toda la cadena de causes para preservar el status HTTP real.
            WebClientResponseException wcre = findWebClientException(e);
            if (wcre != null) {
                throw new IllegalStateException(
                    "gemini_upstream_" + wcre.getStatusCode().value(), wcre);
            }
            // Log de diagnóstico: la clase exacta de la excepción y su cadena
            // completa de causes, para averiguar por qué el wcre no se encuentra.
            StringBuilder chain = new StringBuilder();
            for (Throwable t = e; t != null && chain.length() < 500; t = t.getCause()) {
                chain.append(t.getClass().getSimpleName()).append("(").append(t.getMessage()).append(") -> ");
            }
            log.warn("gemini_call_failed chain={}", chain);
            throw new IllegalStateException("gemini_call_failed", e);
        }
    }

    /** Recorre la cadena de causes buscando un WebClientResponseException. */
    private static WebClientResponseException findWebClientException(Throwable t) {
        // Guard contra ciclos (raro pero posible con excepciones custom).
        for (int i = 0; i < 10 && t != null; i++) {
            if (t instanceof WebClientResponseException wcre) return wcre;
            t = t.getCause();
        }
        return null;
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
