package com.autoparts.hub.cache;

import com.autoparts.hub.config.AutopartsProperties;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Optional;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

/**
 * Thin JSON-over-Redis cache with per-namespace TTL.
 *
 * <p>Laximo is a metered SOAP API: every request is billed. This cache is the
 * single place that decides how long a given kind of answer may be reused, so
 * the cost model stays visible and tunable through
 * {@code autoparts.cache.ttl.*}.
 *
 * <p>Design notes:
 * <ul>
 *   <li>Values are stored as plain JSON strings - debuggable with {@code redis-cli}.</li>
 *   <li>Types go through {@link TypeReference}, so a cached
 *       {@code List<CatalogNode>} comes back as real nodes instead of maps.</li>
 *   <li>Keys are hashed, so long VIN/brand chains never blow past key limits.</li>
 *   <li>A Redis outage degrades to "always MISS" instead of breaking the widget.</li>
 *   <li>Serialization runs on {@code boundedElastic} to keep the event loop free.</li>
 * </ul>
 */
public class JsonCacheService {

    private static final Logger log = LoggerFactory.getLogger(JsonCacheService.class);

    private final ReactiveStringRedisTemplate redis;
    private final ObjectMapper mapper;
    private final AutopartsProperties props;

    public JsonCacheService(ReactiveStringRedisTemplate redis, ObjectMapper mapper, AutopartsProperties props) {
        this.redis = redis;
        this.mapper = mapper;
        this.props = props;
    }

    /** Cached lookup result: the value plus whether it came from Redis. */
    public record Cached<T>(T value, CacheStatus status) {
    }

    public <T> Mono<Cached<T>> getOrLoad(String namespace, String keyPart, Duration ttl,
                                         TypeReference<T> type, Supplier<Mono<T>> loader) {
        if (!props.getCache().isEnabled()) {
            return loader.get().map(value -> new Cached<>(value, CacheStatus.BYPASS));
        }
        String key = buildKey(namespace, keyPart);
        return redis.opsForValue().get(key)
                .flatMap(raw -> deserialize(raw, type))
                .map(value -> new Cached<>(value, CacheStatus.HIT))
                .switchIfEmpty(Mono.defer(() -> loader.get()
                        .flatMap(value -> write(key, value, ttl).thenReturn(value))
                        .map(value -> new Cached<>(value, CacheStatus.MISS))))
                .onErrorResume(err -> {
                    log.warn("Cache read failed for {} ({}), falling back to upstream", key, err.toString());
                    return loader.get().map(value -> new Cached<>(value, CacheStatus.BYPASS));
                });
    }

    /** Reads a value without triggering an upstream call. */
    public <T> Mono<Optional<T>> peek(String namespace, String keyPart, TypeReference<T> type) {
        if (!props.getCache().isEnabled()) {
            return Mono.just(Optional.empty());
        }
        return redis.opsForValue().get(buildKey(namespace, keyPart))
                .flatMap(raw -> deserialize(raw, type))
                .map(Optional::of)
                .defaultIfEmpty(Optional.empty())
                .onErrorResume(err -> Mono.just(Optional.empty()));
    }

    public Mono<Void> evict(String namespace, String keyPart) {
        return redis.delete(buildKey(namespace, keyPart))
                .doOnSuccess(removed -> log.debug("Evicted {}:{} ({} keys)", namespace, keyPart, removed))
                .then();
    }

    private <T> Mono<Void> write(String key, T value, Duration ttl) {
        return Mono.fromCallable(() -> mapper.writeValueAsString(value))
                .flatMap(json -> redis.opsForValue().set(key, json, ttl))
                .doOnError(err -> log.warn("Cache write failed for {}: {}", key, err.toString()))
                .onErrorResume(err -> Mono.empty())
                .then()
                .subscribeOn(Schedulers.boundedElastic());
    }

    private <T> Mono<T> deserialize(String raw, TypeReference<T> type) {
        return Mono.fromCallable(() -> mapper.readValue(raw, type))
                .onErrorResume(err -> {
                    log.warn("Discarding malformed cache entry: {}", err.toString());
                    return Mono.empty();
                })
                .subscribeOn(Schedulers.boundedElastic());
    }

    private String buildKey(String namespace, String keyPart) {
        return props.getCache().getKeyPrefix() + namespace + ":" + sha256(keyPart);
    }

    /** Short, stable hash: keeps keys short and avoids putting VINs in plaintext. */
    static String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(bytes, 0, 12);
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
