package com.autoparts.hub.dto;

import java.util.List;

/**
 * Result of an OEM (original equipment number) lookup: the matched part plus
 * its cross numbers / analogues and where the number is applicable.
 */
public record OemSearchResult(
        String oem,
        String brand,
        String name,
        String ean,
        String category,
        String note,
        List<CrossPart> crosses,
        List<Applicability> applicability,
        Integer minPrice,
        String currency) {

    /**
     * A cross number: OEM of another brand that replaces the searched one.
     * {@code original} marks manufacturer (OE) references.
     */
    public record CrossPart(
            String oem,
            String brand,
            String name,
            Integer price,
            String currency,
            Boolean inStock,
            Boolean original,
            String supplier) {
    }

    /** Vehicle fitment information for an OEM / cross number. */
    public record Applicability(
            String brand,
            String model,
            String modification,
            String yearRange,
            String note) {
    }
}
