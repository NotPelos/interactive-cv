package dev.notpelos.cv.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // No sessions — stateless API, no CSRF surface
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .csrf(csrf -> csrf.disable())

            // Authorization rules
            .authorizeHttpRequests(auth -> auth
                // Actuator — only health and info; see application.yml for exposure
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                // OpenAPI + Swagger UI
                .requestMatchers(
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    "/v3/api-docs/**"
                ).permitAll()
                // Everything else is denied by default (MVP endpoints added per task)
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
