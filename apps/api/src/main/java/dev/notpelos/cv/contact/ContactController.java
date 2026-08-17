package dev.notpelos.cv.contact;

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
 * Contact form endpoint.
 *
 * Flow per request:
 *   1. Rate limit (5 req/min per IP, Bucket4j + Caffeine).
 *   2. Bean validation of the ContactRequest DTO.
 *   3. Turnstile token verified server-side against Cloudflare.
 *   4. Email dispatched via Resend.
 *
 * Response is intentionally minimal ({"ok": true}) — no email id, no internal
 * details. The frontend just needs to know success/failure.
 *
 * Failure taxonomy:
 *   429  rate limit
 *   400  validation failed (handled by GlobalExceptionHandler)
 *   403  turnstile verification failed
 *   502  email upstream unavailable
 */
@Validated
@RestController
@RequestMapping("/api")
@Tag(name = "Contact", description = "Contact form for recruiters — validated, rate-limited, Turnstile-protected")
public class ContactController {

    private static final Logger log = LoggerFactory.getLogger(ContactController.class);

    private final TurnstileVerifier turnstile;
    private final ResendClient resend;
    private final ContactRateLimitConfig rateLimit;

    public ContactController(
        TurnstileVerifier turnstile,
        ResendClient resend,
        ContactRateLimitConfig rateLimit
    ) {
        this.turnstile = turnstile;
        this.resend = resend;
        this.rateLimit = rateLimit;
    }

    @PostMapping(
        value = "/contact",
        consumes = MediaType.APPLICATION_JSON_VALUE,
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    @Operation(
        summary = "Send a contact-form message",
        description = "Validates fields, verifies Turnstile server-side, dispatches email via Resend."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Message accepted and dispatched"),
        @ApiResponse(responseCode = "400", description = "Validation failed"),
        @ApiResponse(responseCode = "403", description = "Turnstile verification failed"),
        @ApiResponse(responseCode = "429", description = "Rate limit exceeded"),
        @ApiResponse(responseCode = "502", description = "Email upstream unavailable")
    })
    public ResponseEntity<Map<String, Object>> submit(
        @Valid @RequestBody ContactRequest req,
        HttpServletRequest http
    ) {
        String clientIp = extractClientIp(http);

        // 1. Rate limit — before any external call to save spend on Turnstile/Resend.
        Bucket bucket = rateLimit.resolveBucket(clientIp);
        if (!bucket.tryConsume(1)) {
            log.info("contact_rate_limited");
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header("Retry-After", "60")
                .body(Map.of("ok", false, "error", "rate_limited"));
        }

        // 2. Turnstile — fail closed on any error.
        if (!turnstile.verify(req.turnstileToken(), clientIp)) {
            log.info("contact_turnstile_failed");
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("ok", false, "error", "turnstile_failed"));
        }

        // 3. Send email.
        try {
            resend.sendContactMessage(req);
            return ResponseEntity.ok(Map.of("ok", true));
        } catch (IllegalStateException e) {
            // ResendClient wraps upstream failures — surface as 502.
            log.warn("contact_upstream_failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(Map.of("ok", false, "error", "upstream_failed"));
        }
    }

    /**
     * Same IP-resolution as CvPdfController — Fly-Client-IP → X-Forwarded-For
     * → remoteAddr. Never logged in plain text.
     */
    private String extractClientIp(HttpServletRequest request) {
        String flyIp = request.getHeader("Fly-Client-IP");
        if (flyIp != null && !flyIp.isBlank()) return flyIp.trim();
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) return forwarded.split(",")[0].trim();
        return request.getRemoteAddr();
    }
}
