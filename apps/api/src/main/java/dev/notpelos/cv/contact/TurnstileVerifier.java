package dev.notpelos.cv.contact;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;

/**
 * Verifies Cloudflare Turnstile tokens against the siteverify endpoint.
 *
 * The frontend Turnstile widget produces a token that MUST be verified
 * server-side before the request is honoured. Without this step, the widget
 * is decorative and an attacker can bypass it entirely.
 *
 * Fails closed:
 *   - If TURNSTILE_SECRET_KEY is absent → verify() returns false (safer than
 *     silently accepting all tokens during a misconfigured deploy).
 *   - If the upstream call errors or times out → returns false.
 *
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
@Service
public class TurnstileVerifier {

    private static final Logger log = LoggerFactory.getLogger(TurnstileVerifier.class);
    private static final String SITEVERIFY_URL =
        "https://challenges.cloudflare.com/turnstile/v0/siteverify";
    private static final Duration TIMEOUT = Duration.ofSeconds(5);

    private final WebClient webClient;
    private final String secretKey;

    public TurnstileVerifier(
        WebClient.Builder webClientBuilder,
        @Value("${turnstile.secret-key:}") String secretKey
    ) {
        this.webClient = webClientBuilder.build();
        this.secretKey = secretKey;
    }

    /**
     * Verifies the token. Returns true only if Cloudflare confirms it valid.
     * The optional clientIp is passed to Cloudflare for its own fraud checks.
     */
    public boolean verify(String token, String clientIp) {
        if (secretKey == null || secretKey.isBlank()) {
            log.warn("turnstile_missing_secret — rejecting request (fail-closed)");
            return false;
        }
        if (token == null || token.isBlank()) return false;

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("secret", secretKey);
        form.add("response", token);
        if (clientIp != null && !clientIp.isBlank()) {
            form.add("remoteip", clientIp);
        }

        try {
            SiteVerifyResponse response = webClient.post()
                .uri(SITEVERIFY_URL)
                .bodyValue(form)
                .retrieve()
                .onStatus(HttpStatusCode::isError, r -> Mono.error(
                    new IllegalStateException("turnstile upstream " + r.statusCode().value())))
                .bodyToMono(SiteVerifyResponse.class)
                .timeout(TIMEOUT)
                .block();

            if (response == null) return false;
            if (!response.success) {
                // Log without any PII (no IP, no token) — only Cloudflare's error codes.
                log.info("turnstile_denied errors={}", response.errorCodes);
            }
            return response.success;
        } catch (Exception e) {
            // WebClient timeouts, network errors, deserialization errors → fail closed.
            log.warn("turnstile_verify_error: {}", e.getClass().getSimpleName());
            return false;
        }
    }

    /**
     * Cloudflare siteverify response shape (subset — we only care about `success`).
     * Unknown fields are ignored to survive schema additions upstream.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class SiteVerifyResponse {
        public boolean success;
        public java.util.List<String> errorCodes;
    }
}
