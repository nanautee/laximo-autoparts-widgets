package com.autoparts.hub.dto;

/**
 * Concrete vehicle variant (year + engine + trim). {@code laximoVehicleId} is
 * the value that later catalog calls are keyed by.
 */
public record Modification(
        String id,
        String modelId,
        String name,
        Integer yearFrom,
        Integer yearTo,
        String engine,
        String fuel,
        String gearbox,
        String drive,
        String body,
        String power,
        String platformId) {
}
