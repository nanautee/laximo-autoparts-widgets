package com.autoparts.hub.cache;

import com.autoparts.hub.dto.Brand;
import com.autoparts.hub.dto.CatalogNode;
import com.autoparts.hub.dto.Modification;
import com.autoparts.hub.dto.Model;
import com.autoparts.hub.dto.OemSearchResult;
import com.autoparts.hub.dto.Vehicle;
import com.fasterxml.jackson.core.type.TypeReference;
import java.util.List;

/**
 * {@link TypeReference} constants for the cached payload shapes.
 *
 * Keeping them in one place documents exactly which structures are cached and
 * lets Jackson rebuild the concrete element types (a raw {@code List.class}
 * would deserialize into maps and blow up on first use).
 */
public final class CacheTypes {

    public static final TypeReference<Vehicle> VEHICLE = new TypeReference<>() {
    };

    public static final TypeReference<List<CatalogNode>> CATALOG_NODES = new TypeReference<>() {
    };

    public static final TypeReference<List<Brand>> BRANDS = new TypeReference<>() {
    };

    public static final TypeReference<List<Model>> MODELS = new TypeReference<>() {
    };

    public static final TypeReference<List<Modification>> MODIFICATIONS = new TypeReference<>() {
    };

    public static final TypeReference<OemSearchResult> OEM_RESULT = new TypeReference<>() {
    };

    private CacheTypes() {
    }
}
