package dev.notpelos.cv.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Simple in-memory visit counter.
 *
 * Increments on every GET. Not persisted — Fly.io auto-stop resets it,
 * which is acceptable for an MVP showcase (the number signals "alive",
 * not business analytics).
 *
 * AtomicLong ensures thread-safe increment without locking overhead.
 * No rate limit here: the counter read is O(1) and non-CPU-intensive.
 */
@RestController
@RequestMapping("/api")
@Tag(name = "Visits", description = "In-memory visit counter")
public class VisitsController {

    private final AtomicLong counter = new AtomicLong(0);

    @GetMapping("/visits")
    @Operation(
        summary = "Get and increment visit count",
        description = "Returns the current visit count incremented by this request. Resets on service restart."
    )
    @ApiResponse(responseCode = "200", description = "Current visit count")
    // No rate limit by design: counter is in-memory and benign; resets on restart.
    // An attacker inflating the counter gains nothing — it is purely cosmetic and
    // non-persistent. Adding Bucket4j here would add complexity with no security benefit.
    public Map<String, Long> getVisits() {
        return Map.of("count", counter.incrementAndGet());
    }
}
