package com.autoparts.hub.service;

import com.autoparts.hub.cache.CacheStatus;
import com.autoparts.hub.cache.CacheTypes;
import com.autoparts.hub.cache.JsonCacheService;
import com.autoparts.hub.client.laximo.LaximoGateway;
import com.autoparts.hub.config.AutopartsProperties;
import com.autoparts.hub.dto.OemSearchResult;
import com.autoparts.hub.dto.ResponseMeta;
import com.autoparts.hub.error.ApiException;
import java.util.Locale;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

/**
 * OEM number lookup with cross references and applicability.
 *
 * <p>Shortest TTL in the system (6 h by default): cross-reference tables are
 * the fastest-moving data Laximo exposes, and the widget is the one users
 * re-query most often with slightly different formats, so the cache key is
 * normalised aggressively.
 */
@Service
public class OemService {

    private static final int MIN_LENGTH = 4;
    private static final int MAX_LENGTH = 32;

    private final LaximoGateway laximo;
    private final JsonCacheService cache;
    private final AutopartsProperties props;

    public OemService(LaximoGateway laximo, JsonCacheService cache, AutopartsProperties props) {
        this.laximo = laximo;
        this.cache = cache;
        this.props = props;
    }

    public Mono<ServiceResult<OemSearchResult>> search(String rawOem) {
        long started = System.nanoTime();
        String oem = normalize(rawOem);
        return cache.getOrLoad("oem", oem, props.getCache().getTtl().getCross(), CacheTypes.OEM_RESULT,
                        () -> laximo.searchOem(oem))
                .map(result -> ServiceResult.of(result.value(), meta(started, result.status())));
    }

    /**
     * Normalises an OEM number so {@code "11 12 27529 817"},
     * {@code "11-12-27529-817"} and {@code "111227529817"} share one cache entry.
     */
    public static String normalize(String rawOem) {
        if (rawOem == null || rawOem.isBlank()) {
            throw ApiException.badRequest("OEM_REQUIRED", "OEM number is required",
                    "Enter a part number, e.g. 34116860114.");
        }
        String oem = rawOem.replaceAll("[^A-Za-z0-9]", "").toUpperCase(Locale.ROOT);
        if (oem.length() < MIN_LENGTH || oem.length() > MAX_LENGTH) {
            throw ApiException.badRequest("OEM_LENGTH",
                    "OEM number must be " + MIN_LENGTH + "-" + MAX_LENGTH + " characters",
                    "Spaces, dashes and country prefixes are ignored.");
        }
        return oem;
    }

    private ResponseMeta meta(long startedNano, com.autoparts.hub.cache.CacheStatus status) {
        long ms = (System.nanoTime() - startedNano) / 1_000_000;
        String note = props.getMock().isEnabled()
                ? "Демо-режим: встроенные фикстуры вместо платного API Laximo"
                : null;
        return new ResponseMeta(laximo.sourceName(), status.name(), ms, note);
    }
}
