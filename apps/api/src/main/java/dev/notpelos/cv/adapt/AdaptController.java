package dev.notpelos.cv.adapt;

import io.github.bucket4j.Bucket;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * POST /api/cv/adapt — adapta el CV a una descripción de puesto usando Gemini.
 *
 * Flujo:
 *   1. Rate limit (10 req/min por IP) — antes del prompt caro.
 *   2. Validación del body (jakarta.validation).
 *   3. CvAdapter llama a Gemini con structured output.
 *   4. Respuesta = índices de items relevantes + summary custom.
 *
 * Sin Turnstile aquí porque el escenario de abuso es distinto al del contact
 * form: no envía mensajes, solo consume tokens de Gemini. El rate limit + el
 * free tier de Gemini (1500 req/día) es la mitigación suficiente para MVP.
 * Si vemos abuso real, añadimos Turnstile como segunda barrera.
 */
@Validated
@RestController
@RequestMapping("/api/cv")
@Tag(name = "CV Adapt", description = "Adapta el CV a una descripción de puesto vía Gemini")
public class AdaptController {

    private static final Logger log = LoggerFactory.getLogger(AdaptController.class);

    private final CvAdapter adapter;
    private final AdaptRateLimitConfig rateLimit;

    public AdaptController(CvAdapter adapter, AdaptRateLimitConfig rateLimit) {
        this.adapter = adapter;
        this.rateLimit = rateLimit;
    }

    @PostMapping(
        value = "/adapt",
        consumes = MediaType.APPLICATION_JSON_VALUE,
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    @Operation(
        summary = "Adapt CV to a job description",
        description = "Returns indices of CV items most relevant to the given job description, plus a custom summary."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Adaptation returned"),
        @ApiResponse(responseCode = "400", description = "Validation failed"),
        @ApiResponse(responseCode = "429", description = "Rate limit exceeded"),
        @ApiResponse(responseCode = "502", description = "LLM upstream unavailable")
    })
    public ResponseEntity<?> adapt(
        @Valid @RequestBody AdaptRequest req,
        HttpServletRequest http
    ) {
        String clientIp = extractClientIp(http);

        Bucket bucket = rateLimit.resolveBucket(clientIp);
        if (!bucket.tryConsume(1)) {
            log.info("adapt_rate_limited");
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header("Retry-After", "60")
                .body(Map.of("ok", false, "error", "rate_limited"));
        }

        try {
            AdaptResponse result = adapter.adapt(req);
            log.info("adapt_ok score={}", result.matchScore());
            return ResponseEntity.ok(result);
        } catch (IllegalStateException e) {
            log.warn("adapt_upstream_failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(Map.of("ok", false, "error", "upstream_failed"));
        }
    }

    private String extractClientIp(HttpServletRequest request) {
        String flyIp = request.getHeader("Fly-Client-IP");
        if (flyIp != null && !flyIp.isBlank()) return flyIp.trim();
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) return forwarded.split(",")[0].trim();
        return request.getRemoteAddr();
    }
}
