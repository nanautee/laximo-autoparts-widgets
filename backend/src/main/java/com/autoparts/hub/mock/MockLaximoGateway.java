package com.autoparts.hub.mock;

import com.autoparts.hub.client.laximo.LaximoGateway;
import com.autoparts.hub.dto.Brand;
import com.autoparts.hub.dto.CatalogNode;
import com.autoparts.hub.dto.Modification;
import com.autoparts.hub.dto.Model;
import com.autoparts.hub.dto.OemSearchResult;
import com.autoparts.hub.dto.Vehicle;
import com.autoparts.hub.error.ApiException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

/**
 * Fixture-backed gateway, active when {@code autoparts.mock.enabled=true}
 * (the default). It keeps the public demo - and the Railway deployment -
 * working without paid Laximo credentials, while exercising exactly the same
 * service, cache and DTO code paths as the live integration.
 */
@Service
@ConditionalOnProperty(name = "autoparts.mock.enabled", havingValue = "true", matchIfMissing = true)
public class MockLaximoGateway implements LaximoGateway {

    @Override
    public String sourceName() {
        return "mock";
    }

    @Override
    public Mono<Vehicle> decodeVin(String vin) {
        return Mono.fromSupplier(() -> {
            String normalized = vin.trim().toUpperCase(Locale.ROOT);
            if (Fixtures.VIN_INDEX.containsKey(normalized)) {
                return Fixtures.VIN_INDEX.get(normalized);
            }
            // Any syntactically valid VIN resolves to a stable, plausible vehicle.
            int bucket = Math.abs(normalized.hashCode() % Fixtures.VEHICLES.size());
            Vehicle base = Fixtures.VEHICLES.get(bucket);
            return new Vehicle(base.vehicleId(), normalized, base.brand(), base.model(), base.modification(),
                    base.year(), base.engine(), base.fuel(), base.gearbox(), base.drive(), base.body(),
                    base.power(), base.country(), "RU", base.imageUrl(), base.oemPlatforms());
        });
    }

    @Override
    public Mono<List<Brand>> brands(String query) {
        return Mono.fromSupplier(() -> {
            if (query == null || query.isBlank()) {
                return Dictionaries.BRANDS;
            }
            String q = query.toLowerCase(Locale.ROOT);
            return Dictionaries.BRANDS.stream()
                    .filter(b -> b.name().toLowerCase(Locale.ROOT).contains(q))
                    .toList();
        });
    }

    @Override
    public Mono<List<Model>> models(String brandId) {
        return Mono.fromSupplier(() -> Dictionaries.MODELS.stream()
                .filter(m -> m.brandId().equals(brandId))
                .toList());
    }

    @Override
    public Mono<List<Modification>> modifications(String modelId) {
        return Mono.fromSupplier(() -> {
            List<Modification> mods = Dictionaries.MODIFICATIONS.stream()
                    .filter(m -> m.modelId().equals(modelId))
                    .toList();
            return mods.isEmpty()
                    ? Dictionaries.MODIFICATIONS.stream().limit(4).toList()
                    : mods;
        });
    }

    @Override
    public Mono<List<CatalogNode>> catalog(String vehicleId, String groupId) {
        return Mono.fromSupplier(() -> {
            Map<String, List<CatalogNode>> tree = Fixtures.catalog(vehicleId);
            if (groupId == null || groupId.isBlank()) {
                return tree.getOrDefault("root", List.of());
            }
            return tree.getOrDefault(groupId, List.of());
        });
    }

    @Override
    public Mono<OemSearchResult> searchOem(String oem) {
        return Mono.fromSupplier(() -> {
            String key = oem.replaceAll("[^A-Za-z0-9]", "").toUpperCase(Locale.ROOT);
            OemSearchResult result = Fixtures.OEM_INDEX.get(key);
            if (result == null) {
                result = Fixtures.genericOemResult(oem);
            }
            return result;
        });
    }
}
