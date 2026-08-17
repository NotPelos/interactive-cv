package dev.notpelos.cv.contact;

import org.junit.jupiter.api.Test;
import org.springframework.web.reactive.function.client.WebClient;

import static org.junit.jupiter.api.Assertions.assertFalse;

/**
 * Unit tests for the "safe defaults" of TurnstileVerifier — cases where the
 * verifier should reject WITHOUT ever hitting Cloudflare. Full integration
 * with the siteverify endpoint is not tested here (it belongs to a manual
 * smoke or a WireMock-backed test if it becomes valuable).
 */
class TurnstileVerifierTest {

    @Test
    void missingSecret_alwaysReturnsFalse() {
        TurnstileVerifier v = new TurnstileVerifier(WebClient.builder(), "");
        assertFalse(v.verify("any-token", "1.2.3.4"));
    }

    @Test
    void nullToken_returnsFalse() {
        TurnstileVerifier v = new TurnstileVerifier(WebClient.builder(), "secret-abc");
        assertFalse(v.verify(null, "1.2.3.4"));
    }

    @Test
    void blankToken_returnsFalse() {
        TurnstileVerifier v = new TurnstileVerifier(WebClient.builder(), "secret-abc");
        assertFalse(v.verify("   ", "1.2.3.4"));
    }
}
