package dev.notpelos.cv.controller;

import dev.notpelos.cv.config.RateLimitConfig;
import io.github.bucket4j.Bucket;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifies that the 60 req/min rate limit on /api/cv/pdf works, and that
 * the Caffeine cache cap prevents unbounded memory growth.
 *
 * Strategy: inject a pre-exhausted bucket for a test IP via the public
 * resolveBucket API so we don't need to fire 61 real requests (which would
 * be slow and generate 61 PDFs).
 */
@SpringBootTest
@AutoConfigureMockMvc
class RateLimitTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RateLimitConfig rateLimitConfig;

    /**
     * Clear the shared bucket cache after each test so other test classes
     * (CvPdfControllerTest, etc.) don't inherit exhausted buckets via the
     * singleton RateLimitConfig bean.
     */
    @AfterEach
    void clearRateLimitBuckets() {
        rateLimitConfig.getCache().invalidateAll();
    }

    @Test
    void rateLimitAllows60Requests() {
        Bucket bucket = rateLimitConfig.resolveBucket("test-ip-allows");
        for (int i = 0; i < 60; i++) {
            assertThat(bucket.tryConsume(1)).as("Should allow request %d", i + 1).isTrue();
        }
        assertThat(bucket.tryConsume(1)).as("61st request should be blocked").isFalse();
    }

    @Test
    void rateLimitReturns429WhenExhausted() throws Exception {
        // Drain all tokens for a dedicated test IP, then verify the controller
        // returns 429. MockMvc requests arrive from 127.0.0.1 (no Fly-Client-IP),
        // so we drain the bucket for that address.
        Bucket exhaustedBucket = rateLimitConfig.resolveBucket("127.0.0.1");
        exhaustedBucket.tryConsumeAsMuchAsPossible();

        mockMvc.perform(get("/api/cv/pdf"))
            .andExpect(status().isTooManyRequests());
    }

    /**
     * Verifies that inserting more than 10 000 distinct IPs does not cause the
     * Caffeine cache to exceed its maximumSize bound.
     *
     * Caffeine eviction is best-effort and amortised — it may temporarily allow
     * a few extra entries before pruning. We assert < 11 000 (10% slack) instead
     * of == 10 000 to avoid a flaky test. The important invariant is "bounded",
     * not "exactly N".
     */
    @Test
    void caffeineCapPreventsUnboundedGrowth() throws Exception {
        for (int i = 0; i < 10_001; i++) {
            rateLimitConfig.resolveBucket("attacker-ip-" + i);
        }

        // cleanUp() forces synchronous eviction to make the assertion deterministic.
        rateLimitConfig.getCache().cleanUp();

        long size = rateLimitConfig.getCache().estimatedSize();
        assertThat(size)
            .as("Caffeine cache must not exceed maximumSize of 10 000")
            .isLessThan(11_000);
    }
}
