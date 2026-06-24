package dev.notpelos.cv.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * CORS configuration for the public API endpoints.
 *
 * Allowed origin is read from the ALLOWED_ORIGIN env var (for Fly.io secrets/env)
 * with a safe default pointing to the Cloudflare Pages domain.
 * Wildcard origins are never used.
 *
 * This bean is referenced by SecurityConfig which wires it into Spring Security's
 * filter chain so CORS headers are applied before authorization runs.
 */
@Configuration
public class CorsConfig {

    @Value("${app.cors.allowed-origin:https://notpelos.pages.dev}")
    private String allowedOrigin;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(allowedOrigin));
        config.setAllowedMethods(List.of("GET", "OPTIONS"));
        // Minimum privilege: only the headers actually needed by the frontend.
        // Wildcard ("*") is intentionally avoided per SECURITY.md.
        config.setAllowedHeaders(List.of("Content-Type", "Accept"));
        config.setMaxAge(86400L);
        // No credentials — public read-only API
        config.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // Apply only to /api/** — actuator and swagger get no CORS headers
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
