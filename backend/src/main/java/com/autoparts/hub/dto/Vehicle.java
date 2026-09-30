package com.autoparts.hub.dto;

import java.util.List;

/**
 * Vehicle identity produced by VIN decoding or by manual catalog navigation.
 * Mirrors the Laximo AXAM vehicle tree but flattened for widget consumption.
 */
public record Vehicle(
        String vehicleId,
        String vin,
        String brand,
        String model,
        String modification,
        Integer year,
        String engine,
        String fuel,
        String gearbox,
        String drive,
        String body,
        String power,
        String country,
        String market,
        String imageUrl,
        List<String> oemPlatforms) {
}
