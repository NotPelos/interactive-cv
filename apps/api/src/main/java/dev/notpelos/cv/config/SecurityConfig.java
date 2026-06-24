package dev.notpelos.cv.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final CorsConfigurationSource corsConfigurationSource;

    public SecurityConfig(CorsConfigurationSource corsConfigurationSource) {
        this.corsConfigurationSource = corsConfigurationSource;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // No sessions — stateless API, no CSRF surface
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .csrf(csrf -> csrf.disable())

            // Wire CORS config from CorsConfig bean
            .cors(cors -> cors.configurationSource(corsConfigurationSource))

            // Authorization rules
            .authorizeHttpRequests(auth -> auth
                // Spring error dispatcher — must be accessible for error responses to render
                .requestMatchers("/error").permitAll()
                // Actuator — only health and info; see application.yml for exposure
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                // OpenAPI + Swagger UI
                .requestMatchers(
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    "/v3/api-docs/**"
                ).permitAll()
                // MVP public endpoints
                .requestMatchers("/api/cv/pdf").permitAll()
                .requestMatchers("/api/visits").permitAll()
                // Everything else is denied by default
                .anyRequest().denyAll()
            )

            // Security headers
            .headers(headers -> headers
                .contentTypeOptions(ct -> {})        // X-Content-Type-Options: nosniff
                .frameOptions(frame -> frame.deny())  // X-Frame-Options: DENY
                .httpStrictTransportSecurity(hsts ->  // HSTS 1 year
                    hsts.maxAgeInSeconds(31536000).includeSubDomains(true))
            );

        return http.build();
    }
}
