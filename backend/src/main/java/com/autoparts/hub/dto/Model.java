package com.autoparts.hub.dto;

import java.util.List;

/**
 * Model within a brand. {@code years} drives the year step of the catalog
 * widget, {@code modificationCount} is shown as a hint before the request.
 */
public record Model(String id, String brandId, String name, List<Integer> years, Integer modificationCount) {
}
