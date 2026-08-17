package dev.notpelos.cv.contact;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for POST /api/contact.
 *
 * Server-side validation via jakarta.validation — the frontend also validates
 * but the server is the authoritative gate (never trust the client). Constraints
 * are conservative: shorter than a real contact form's absolute limits, tighter
 * than what most spam-bots emit.
 *
 * All fields except `company` are required. `turnstileToken` comes from the
 * Cloudflare Turnstile widget in the browser and is verified server-side
 * before the email is sent — see TurnstileVerifier.
 */
public record ContactRequest(
    @NotBlank(message = "name is required")
    @Size(min = 2, max = 80, message = "name must be 2-80 chars")
    String name,

    @NotBlank(message = "email is required")
    @Email(message = "email must be a valid address")
    @Size(max = 120, message = "email too long")
    String email,

    // Optional field — sender may or may not represent a company.
    @Size(max = 100, message = "company too long")
    String company,

    @NotBlank(message = "message is required")
    @Size(min = 20, max = 3000, message = "message must be 20-3000 chars")
    String message,

    @NotBlank(message = "turnstileToken is required")
    @Size(max = 4096, message = "turnstileToken too long")
    String turnstileToken
) {}
