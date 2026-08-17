package dev.notpelos.cv.contact;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Full-context integration test for POST /api/contact.
 *
 * Uses @SpringBootTest so Security, CORS and validation are exercised end-to-end.
 * Only the two "boundary" collaborators (Turnstile + Resend) are mocked — the
 * things that actually leave the process.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ContactControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper mapper;
    @Autowired ContactRateLimitConfig rateLimit;

    @MockBean TurnstileVerifier turnstile;
    @MockBean ResendClient resend;

    @BeforeEach
    void freshBuckets() {
        // Isolate rate-limit state across tests — otherwise a test that exhausts
        // the bucket for "127.0.0.1" would leak into the next test.
        rateLimit.getCache().invalidateAll();
    }

    /** Build a well-formed request body. Override the map to test bad-input variants. */
    private static Map<String, String> validPayload() {
        return Map.of(
            "name", "Ana García",
            "email", "ana@example.com",
            "company", "Acme SL",
            "message", "Hola, me interesa tu perfil para un puesto backend Java.",
            "turnstileToken", "cf-turnstile-token-mock-value"
        );
    }

    @Test
    void happyPath_returnsOkAndCallsResend() throws Exception {
        when(turnstile.verify(anyString(), anyString())).thenReturn(true);
        when(resend.sendContactMessage(any(ContactRequest.class))).thenReturn("msg_123");

        mockMvc.perform(post("/api/contact")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(validPayload())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.ok").value(true));

        verify(resend).sendContactMessage(any(ContactRequest.class));
    }

    @Test
    void missingField_returns400_andSkipsResend() throws Exception {
        // No message → bean validation should fail
        Map<String, String> bad = new java.util.HashMap<>(validPayload());
        bad.remove("message");

        when(turnstile.verify(anyString(), anyString())).thenReturn(true);

        mockMvc.perform(post("/api/contact")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(bad)))
            .andExpect(status().isBadRequest());

        verify(resend, never()).sendContactMessage(any());
    }

    @Test
    void invalidEmail_returns400() throws Exception {
        Map<String, String> bad = new java.util.HashMap<>(validPayload());
        bad.put("email", "not-an-email");

        mockMvc.perform(post("/api/contact")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(bad)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void turnstileFails_returns403_andSkipsResend() throws Exception {
        when(turnstile.verify(anyString(), anyString())).thenReturn(false);

        mockMvc.perform(post("/api/contact")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(validPayload())))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error").value("turnstile_failed"));

        verify(resend, never()).sendContactMessage(any());
    }

    @Test
    void resendUpstreamFailure_returns502() throws Exception {
        when(turnstile.verify(anyString(), anyString())).thenReturn(true);
        doThrow(new IllegalStateException("resend_upstream_500"))
            .when(resend).sendContactMessage(any(ContactRequest.class));

        mockMvc.perform(post("/api/contact")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(validPayload())))
            .andExpect(status().isBadGateway())
            .andExpect(jsonPath("$.error").value("upstream_failed"));
    }

    @Test
    void rateLimit_blocksAfterFiveRequests() throws Exception {
        when(turnstile.verify(anyString(), anyString())).thenReturn(true);
        when(resend.sendContactMessage(any())).thenReturn("id");

        String body = mapper.writeValueAsString(validPayload());
        // 5 allowed
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/contact")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
                .andExpect(status().isOk());
        }
        // 6th is throttled
        mockMvc.perform(post("/api/contact")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isTooManyRequests())
            .andExpect(jsonPath("$.error").value("rate_limited"));
    }

    @Test
    void wrongMethod_isRejected() throws Exception {
        // SecurityConfig only permits POST /api/contact — other methods hit
        // .anyRequest().denyAll() and get 403 before MVC's 405. Either
        // response prevents the handler from running, which is what matters.
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .get("/api/contact"))
            .andExpect(status().isForbidden());
    }
}
