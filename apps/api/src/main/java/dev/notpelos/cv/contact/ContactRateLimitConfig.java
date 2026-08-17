package dev.notpelos.cv.contact;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Rate limiter for POST /api/contact — stricter than the PDF endpoint.
 *
 * 5 tokens/minute per IP: a legitimate visitor writes ONE message per session;
 * anything above this rate is a spammer or a brute-force script probing the
 * Turnstile bypass. Bucket4j token-bucket, Caffeine-bounded cache (see
 * RateLimitConfig for the memory-safety rationale — same pattern applies here).
 *
 * A separate bean (not the shared RateLimitConfig) so both endpoints can tune
 * their limits independently without one dragging the other.
 */
@Component
public class ContactRateLimitConfig {

    private static final int CAPACITY = 5;
    private static final Duration REFILL_PERIOD = Duration.ofMinutes(1);

    private final Cache<String, Bucket> buckets = Caffeine.newBuilder()
        .maximumSize(10_000)
        .expireAfterAccess(Duration.ofMinutes(10))
        .build();

    public Bucket resolveBucket(String clientIp) {
        return buckets.get(clientIp, this::newBucket);
    }

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
