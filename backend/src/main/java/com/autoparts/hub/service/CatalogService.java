package com.autoparts.hub.service;

import com.autoparts.hub.cache.CacheStatus;
import com.autoparts.hub.cache.CacheTypes;
import com.autoparts.hub.cache.JsonCacheService;
import com.autoparts.hub.client.laximo.LaximoGateway;
import com.autoparts.hub.config.AutopartsProperties;
import com.autoparts.hub.dto.Brand;
import com.autoparts.hub.dto.Modification;
import com.autoparts.hub.dto.Model;
import com.autoparts.hub.dto.ResponseMeta;
import java.util.List;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

/**
 * Catalog navigation: brand -&gt; model -&gt; year/modification.
 *
 * <p>These dictionaries barely change, so they get the longest TTLs in the
 * system (30 days for brands, 14 for models and modifications). The lists are
 * also stable enough to pre-warm at startup in production.
 */
@Service
public class CatalogService {

    private final LaximoGateway laximo;
    private final JsonCacheService cache;
    private final AutopartsProperties props;

    public CatalogService(LaximoGateway laximo, JsonCacheService cache, AutopartsProperties props) {
        this.laximo = laximo;
        this.cache = cache;
        this.props = props;
    }

    public Mono<ServiceResult<List<Brand>>> brands(String query) {
        long started = System.nanoTime();
        String key = query == null || query.isBlank() ? "all" : "q:" + query.trim().toLowerCase();
        return cache.getOrLoad("brands", key, props.getCache().getTtl().getBrands(), CacheTypes.BRANDS,
                        () -> laximo.brands(query))
                .map(result -> ServiceResult.of(result.value(), meta(started, result.status())));
    }

    public Mono<ServiceResult<List<Model>>> models(String brandId) {
        long started = System.nanoTime();
        return cache.getOrLoad("models", brandId, props.getCache().getTtl().getModels(), CacheTypes.MODELS,
                        () -> laximo.models(brandId))
                .map(result -> ServiceResult.of(result.value(), meta(started, result.status())));
    }

    public Mono<ServiceResult<List<Modification>>> modifications(String modelId) {
        long started = System.nanoTime();
        return cache.getOrLoad("modifications", modelId, props.getCache().getTtl().getModifications(), CacheTypes.MODIFICATIONS,
                        () -> laximo.modifications(modelId))
                .map(result -> ServiceResult.of(result.value(),
                        meta(started, result.status())));
    }

    private ResponseMeta meta(long startedNano, CacheStatus status) {
        long ms = (System.nanoTime() - startedNano) / 1_000_000;
        String note = props.getMock().isEnabled()
                ? "Демо-режим: встроенные фикстуры вместо платного API Laximo"
                : null;
        return new ResponseMeta(laximo.sourceName(), status.name(), ms, note);
    }

}
