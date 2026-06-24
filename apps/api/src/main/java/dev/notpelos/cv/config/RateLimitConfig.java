package dev.notpelos.cv.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * In-process rate limiter for the PDF endpoint using Bucket4j.
 *
 * Strategy: one bucket per client IP, 60 tokens/minute (token bucket algorithm).
 * Buckets are stored in a Caffeine cache bounded to 10 000 entries with a
 * 10-minute idle eviction. This caps memory usage and prevents a DoS attack
 * that would fill the JVM heap by sending requests from a large number of
 * distinct IPs.
 *
 * Previous implementation used ConcurrentHashMap which grows without bound —
 * replaced with Caffeine to enforce the size cap. See SECURITY.md.
 *
 * Why Bucket4j core (not the Spring Boot starter)?
 * The starter adds auto-configuration and servlet filter wiring that couples
 * rate limiting to Spring's filter chain. Using bucket4j-core directly gives
 * full control in the controller, which is easier to test with MockMvc.
 *
 * Horizontal scaling note: if the service scales beyond a single Fly.io instance,
 * migrate to a distributed backend (bucket4j-redis). For the MVP this is
 * sufficient.
 */
@Component
public class RateLimitConfig {

    private static final int CAPACITY = 60;                      // tokens per window
    private static final Duration REFILL_PERIOD = Duration.ofMinutes(1);

    // Bounded Caffeine cache: max 10 000 IPs, evict entries idle for 10 min.
    // This prevents unbounded heap growth under IP-spoofing / enumeration attacks.
    private final Cache<String, Bucket> buckets = Caffeine.newBuilder()
        .maximumSize(10_000)
        .expireAfterAccess(Duration.ofMinutes(10))
        .build();

    /**
     * Returns (or lazily creates) the rate-limit bucket for the given client IP.
     */
    public Bucket resolveBucket(String clientIp) {
        return buckets.get(clientIp, this::newBucket);
    }

    /**
     * Exposes the underlying Caffeine cache for test assertions on cache size.
     * Not used in production code paths.
     */
    public Cache<String, Bucket> getCache() {
        return buckets;
    }

    private Bucket newBucket(String ignored) {
        Bandwidth limit = Bandwidth.builder()
            .capacity(CAPACITY)
            .refillGreedy(CAPACITY, REFILL_PERIOD)
            .build();
        return Bucket.builder().addLimit(limit).build();
    }
}
