package dev.notpelos.cv.controller;

import com.lowagie.text.DocumentException;
import dev.notpelos.cv.config.RateLimitConfig;
import dev.notpelos.cv.service.ContentLoader;
import dev.notpelos.cv.service.CvData;
import dev.notpelos.cv.service.PdfGenerator;
import io.github.bucket4j.Bucket;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

/**
 * Generates and serves the CV as a PDF on demand.
 *
 * Rate limited to 60 req/min per IP using Bucket4j (PDF generation is CPU-bound).
 * Language selection via ?lang=es|en (default: es).
 */
@Validated
@RestController
@RequestMapping("/api/cv")
@Tag(name = "CV", description = "CV PDF generation endpoint")
public class CvPdfController {

    private static final Logger log = LoggerFactory.getLogger(CvPdfController.class);

    private final ContentLoader contentLoader;
    private final PdfGenerator pdfGenerator;
    private final RateLimitConfig rateLimitConfig;

    public CvPdfController(
        ContentLoader contentLoader,
        PdfGenerator pdfGenerator,
        RateLimitConfig rateLimitConfig
    ) {
        this.contentLoader = contentLoader;
        this.pdfGenerator = pdfGenerator;
        this.rateLimitConfig = rateLimitConfig;
    }

    @GetMapping(value = "/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @Operation(
        summary = "Download CV as PDF",
        description = "Generates the CV on-demand in the requested language. Rate limited to 60 req/min per IP."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "PDF generated successfully"),
        @ApiResponse(responseCode = "429", description = "Rate limit exceeded"),
        @ApiResponse(responseCode = "500", description = "PDF generation failed")
    })
    public ResponseEntity<byte[]> getPdf(
        @Parameter(description = "Language code: es or en", example = "es")
        @RequestParam(defaultValue = "es")
        @Pattern(regexp = "^(es|en)$", message = "lang must be 'es' or 'en'")
        String lang,
        HttpServletRequest request
    ) {
        // Rate limit check
        String clientIp = extractClientIp(request);
        Bucket bucket = rateLimitConfig.resolveBucket(clientIp);
        if (!bucket.tryConsume(1)) {
            // No IP or hash logged — SECURITY.md: logs must be PII-free.
            // String.hashCode() is trivially reversible for IPv4 addresses.
            // If incident correlation is needed, add SHA-256+salt at that time.
            log.info("rate_limit_exceeded");
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header("Retry-After", "60")
                .build();
        }

        try {
            CvData data = contentLoader.load(lang);
            byte[] pdfBytes = pdfGenerator.generate(data);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            // "attachment" triggers a browser download, consistent with the
            // terminal command copy "Download PDF". Changed from "inline".
            headers.setContentDispositionFormData("attachment",
                "notpelos-cv-" + lang + ".pdf");
            headers.setContentLength(pdfBytes.length);

            log.info("pdf_generated lang={} size_bytes={}", lang, pdfBytes.length);
            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);

        } catch (DocumentException | IOException e) {
            log.error("pdf_generation_failed lang={}", lang, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Extracts the real client IP respecting Fly.io's proxy header.
     * Fly.io sets Fly-Client-IP; fall back to X-Forwarded-For, then remote addr.
     * The IP is never logged — only its hashcode is used for rate limit keys.
     */
    private String extractClientIp(HttpServletRequest request) {
        String flyIp = request.getHeader("Fly-Client-IP");
        if (flyIp != null && !flyIp.isBlank()) {
            return flyIp.trim();
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            // X-Forwarded-For can be a comma-separated list; first entry is client
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
