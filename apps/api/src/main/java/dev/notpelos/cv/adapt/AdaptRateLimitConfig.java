package dev.notpelos.cv.adapt;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Rate limiter para POST /api/cv/adapt — 10 tokens/min por IP.
 *
 * Cada adapt consume una request a Gemini (~4k tokens de input). El free tier
 * de Gemini son 1500 req/día en total, así que el cap por-IP protege el
 * presupuesto global de forma indirecta: un pool IP-rotating de 150 IPs
 * agotaría el día completo en 10 minutos. Para atacantes reales, la cuota de
 * Gemini fallará antes que esta cache, lo cual es aceptable — el server
 * devuelve 502 y siguiente día se recupera.
 */
@Component
public class AdaptRateLimitConfig {

    private static final int CAPACITY = 10;
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
