package dev.notpelos.cv.contact;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;

/**
 * Sends transactional emails via Resend (https://resend.com).
 *
 * Configuration (env / application.yml):
 *   resend.api-key       (secret)   — Bearer token from resend.com/api-keys
 *   resend.from          (address)  — "Name <onboarding@resend.dev>" if no
 *                                     verified domain, or "hi@yourdomain".
 *   contact.to           (address)  — where contact-form messages land.
 *
 * If api-key is missing, sendContactMessage() throws — callers must handle
 * (the controller returns 503 upstream_unavailable in that case).
 */
@Service
public class ResendClient {

    private static final Logger log = LoggerFactory.getLogger(ResendClient.class);
    private static final String ENDPOINT = "https://api.resend.com/emails";
    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    private final WebClient webClient;
    private final String apiKey;
    private final String fromAddress;
    private final String toAddress;

    public ResendClient(
        WebClient.Builder webClientBuilder,
        @Value("${resend.api-key:}") String apiKey,
        @Value("${resend.from:onboarding@resend.dev}") String fromAddress,
        @Value("${contact.to:}") String toAddress
    ) {
        this.webClient = webClientBuilder.build();
        this.apiKey = apiKey;
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
    }

    /**
     * Sends a contact-form submission as an email. The sender's own email goes
     * into `reply_to` so the recipient can just hit Reply and answer directly.
     *
     * Returns the Resend message id on success. Throws on any failure — the
     * controller wraps this into a 502/503 response without leaking internals.
     */
    public String sendContactMessage(ContactRequest req) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("resend_api_key_missing");
        }
        if (toAddress == null || toAddress.isBlank()) {
            throw new IllegalStateException("contact_to_missing");
        }

        // Subject encodes the sender's name and (optional) company so it's
        // scannable in the inbox without opening the message.
        String subject = "[CV contact] " + req.name()
            + (req.company() != null && !req.company().isBlank() ? " · " + req.company() : "");

        String body = buildPlainTextBody(req);

        SendRequest payload = new SendRequest(
            fromAddress,
            List.of(toAddress),
            subject,
            body,
            List.of(req.email())
        );

        try {
            SendResponse response = webClient.post()
                .uri(ENDPOINT)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(payload)
                .retrieve()
                .onStatus(HttpStatusCode::isError, r -> r.bodyToMono(String.class)
                    .defaultIfEmpty("")
                    .flatMap(b -> Mono.error(new IllegalStateException(
                        "resend_upstream_" + r.statusCode().value()))))
                .bodyToMono(SendResponse.class)
                .timeout(TIMEOUT)
                .block();

            String id = response != null ? response.id : null;
            log.info("contact_email_sent id_length={}", id != null ? id.length() : 0);
            return id != null ? id : "";
        } catch (Exception e) {
            // Log without body content — subject/message/email are PII of the sender.
            log.warn("resend_send_failed: {}", e.getClass().getSimpleName());
            throw e instanceof IllegalStateException ise ? ise
                : new IllegalStateException("resend_send_failed", e);
        }
    }

    /**
     * Plain-text body. HTML is intentionally omitted for two reasons:
     * (1) inbox rendering is identical for a short message; (2) any HTML built
     * from user input opens an XSS foothold if the mail client renders it
     * loosely. Plain text is safe by construction.
     */
    private String buildPlainTextBody(ContactRequest req) {
        StringBuilder sb = new StringBuilder(512);
        sb.append("New contact-form message from your CV\n\n");
        sb.append("Name:    ").append(req.name()).append('\n');
        sb.append("Email:   ").append(req.email()).append('\n');
        if (req.company() != null && !req.company().isBlank()) {
            sb.append("Company: ").append(req.company()).append('\n');
        }
        sb.append('\n').append("---\n\n").append(req.message()).append('\n');
        return sb.toString();
    }

    // ---- payload shapes ----

    /**
     * Resend "send email" request. `replyTo` is serialised as `reply_to`.
     * See https://resend.com/docs/api-reference/emails/send-email
     */
    private record SendRequest(
        String from,
        List<String> to,
        String subject,
        String text,
        @JsonProperty("reply_to") List<String> replyTo
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class SendResponse {
        public String id;
    }
}
