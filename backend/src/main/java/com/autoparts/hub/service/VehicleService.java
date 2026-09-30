package com.autoparts.hub.service;

import com.autoparts.hub.cache.CacheStatus;
import com.autoparts.hub.cache.CacheTypes;
import com.autoparts.hub.cache.JsonCacheService;
import com.autoparts.hub.client.laximo.LaximoGateway;
import com.autoparts.hub.config.AutopartsProperties;
import com.autoparts.hub.dto.CatalogNode;
import com.autoparts.hub.dto.ResponseMeta;
import com.autoparts.hub.dto.Vehicle;
import com.autoparts.hub.error.ApiException;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

/**
 * VIN decoding and the per-vehicle parts tree.
 *
 * <p>Caching notes (Laximo bills every SOAP call):
 * <ul>
 *   <li>{@code vin:&lt;hash&gt;} - 72 h. A VIN never changes identity, so a long
 *       TTL is safe and removes nearly all repeat decode cost.</li>
 *   <li>{@code catalog:&lt;hash&gt;} - 7 days per {@code vehicleId + groupId}. A
 *       catalog node is stable within a model year, so drill-down traffic stays
 *       cheap while new parts still appear within a week.</li>
 * </ul>
 */
@Service
public class VehicleService {

    private static final int VIN_LENGTH = 17;

    private final LaximoGateway laximo;
    private final JsonCacheService cache;
    private final AutopartsProperties props;

    public VehicleService(LaximoGateway laximo, JsonCacheService cache, AutopartsProperties props) {
        this.laximo = laximo;
        this.cache = cache;
        this.props = props;
    }

    /** VIN payload: the vehicle card plus the root of the parts tree. */
    public record VinDecodeResult(Vehicle vehicle, List<CatalogNode> groups) {
    }

    private record Decoded(Vehicle vehicle, List<CatalogNode> groups, CacheStatus vehicleCache, CacheStatus groupCache) {
    }

    public Mono<ServiceResult<VinDecodeResult>> decodeVin(String rawVin) {
        long started = System.nanoTime();
        String vin = normalizeVin(rawVin);

        Duration ttl = props.getCache().getTtl().getVinDecode();

        return cache.getOrLoad("vin", vin, ttl, CacheTypes.VEHICLE, () -> laximo.decodeVin(vin))
                .flatMap(vehicle -> cache
                        .getOrLoad("catalog", "root:" + vehicle.value().vehicleId(),
                                props.getCache().getTtl().getCatalog(), CacheTypes.CATALOG_NODES,
                                () -> laximo.catalog(vehicle.value().vehicleId(), null))
                        .map(groups -> new Decoded(vehicle.value(), groups.value(),
                                vehicle.status(), groups.status())))
                .map(decoded -> ServiceResult.of(
                        new VinDecodeResult(decoded.vehicle(), decoded.groups()),
                        meta(started, worst(decoded.vehicleCache(), decoded.groupCache()))));
    }

    /** One level of the parts tree. {@code groupId == null} returns the root. */
    public Mono<ServiceResult<List<CatalogNode>>> catalog(String vehicleId, String groupId) {
        long started = System.nanoTime();
        String key = (groupId == null || groupId.isBlank() ? "root:" : "group:" + groupId) + "|" + vehicleId;
        return cache.getOrLoad("catalog", key, props.getCache().getTtl().getCatalog(), CacheTypes.CATALOG_NODES,
                        () -> laximo.catalog(vehicleId, groupId))
                .map(result -> ServiceResult.of(result.value(), meta(started, result.status())));
    }

    private ResponseMeta meta(long startedNano, CacheStatus cacheStatus) {
        long ms = (System.nanoTime() - startedNano) / 1_000_000;
        String note = props.getMock().isEnabled()
                ? "Демо-режим: встроенные фикстуры вместо платного API Laximo"
                : null;
        return new ResponseMeta(laximo.sourceName(), cacheStatus.name(), ms, note);
    }

    private static CacheStatus worst(CacheStatus a, CacheStatus b) {
        if (a == CacheStatus.MISS || b == CacheStatus.MISS) {
            return CacheStatus.MISS;
        }
        if (a == CacheStatus.BYPASS || b == CacheStatus.BYPASS) {
            return CacheStatus.BYPASS;
        }
        return CacheStatus.HIT;
    }

    /** Upper-cases the VIN and validates it before spending a paid upstream call. */
    public static String normalizeVin(String rawVin) {
        if (rawVin == null || rawVin.isBlank()) {
            throw ApiException.badRequest("VIN_REQUIRED", "VIN is required",
                    "Enter the 17-character VIN from the registration certificate.");
        }
        String vin = rawVin.replaceAll("[^A-Za-z0-9]", "").toUpperCase(Locale.ROOT);
        if (vin.length() != VIN_LENGTH) {
            throw ApiException.badRequest("VIN_LENGTH",
                    "VIN must be exactly 17 characters, got " + vin.length(),
                    "The VIN is printed on the registration certificate and on the dashboard.");
        }
        if (vin.indexOf('I') >= 0 || vin.indexOf('O') >= 0 || vin.indexOf('Q') >= 0) {
            throw ApiException.badRequest("VIN_ALPHABET", "VIN must not contain I, O or Q",
                    "Those letters are not part of the VIN alphabet.");
        }
        return vin;
    }
}
