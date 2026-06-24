package dev.notpelos.cv.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * CORS tests for the Spring Boot API.
 *
 * Default allowed origin is https://notpelos.pages.dev (from application.yml / CorsConfig).
 * In test context there's no override, so we test against that default.
 */
@SpringBootTest
@AutoConfigureMockMvc
class CorsTest {

    @Autowired
    private MockMvc mockMvc;

    private static final String ALLOWED_ORIGIN = "https://notpelos.pages.dev";
    private static final String BLOCKED_ORIGIN = "https://evil.com";

    @Test
    void preflight_fromAllowedOrigin_returns200WithCorsHeaders() throws Exception {
        mockMvc.perform(options("/api/cv/pdf")
                .header("Origin", ALLOWED_ORIGIN)
                .header("Access-Control-Request-Method", "GET"))
            .andExpect(status().isOk())
            .andExpect(header().string("Access-Control-Allow-Origin", ALLOWED_ORIGIN));
    }

    @Test
    void preflight_fromBlockedOrigin_noCorsHeader() throws Exception {
        // Spring Security returns 403 or strips the CORS headers for disallowed origins
        mockMvc.perform(options("/api/cv/pdf")
                .header("Origin", BLOCKED_ORIGIN)
                .header("Access-Control-Request-Method", "GET"))
            .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test
    void get_fromAllowedOrigin_hasCorsHeader() throws Exception {
        mockMvc.perform(get("/api/visits")
                .header("Origin", ALLOWED_ORIGIN))
            .andExpect(status().isOk())
            .andExpect(header().string("Access-Control-Allow-Origin", ALLOWED_ORIGIN));
    }

    @Test
    void get_withNoOriginHeader_hasNoCorsHeader() throws Exception {
        // Direct requests (no Origin) should work and not have CORS header
        mockMvc.perform(get("/api/visits"))
            .andExpect(status().isOk())
            .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }
}
