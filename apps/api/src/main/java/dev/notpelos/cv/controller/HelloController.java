package dev.notpelos.cv.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Hello-world endpoint to verify wiring.
 *
 * NOTE: SecurityConfig#denyAll() blocks this endpoint intentionally.
 * It will return 403 until /api/hello is explicitly permit-listed.
 * That happens when MVP endpoints (/api/cv/pdf, /api/visits) are added
 * in a follow-up task and this endpoint can be removed or promoted.
 */
@RestController
@RequestMapping("/api")
@Tag(name = "Hello", description = "Smoke-test endpoint")
public class HelloController {

    @GetMapping("/hello")
    @Operation(summary = "Stack smoke test", description = "Returns basic stack info. Blocked by SecurityConfig until promoted.")
    public Map<String, String> hello() {
        return Map.of(
            "message", "hello from notpelos",
            "stack", "spring-boot-3 / java-21"
        );
    }
}
