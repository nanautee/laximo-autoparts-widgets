package com.autoparts.hub.dto;

import java.util.List;

/**
 * Unified node of the Laximo parts tree. A node is either a
 * {@link Kind#GROUP} (assembly / sub-assembly) or a {@link Kind#PART}
 * (concrete part with an OEM number, price and stock).
 */
public record CatalogNode(
        String id,
        Kind kind,
        String name,
        String nameRu,
        String oem,
        String brand,
        String ean,
        Integer price,
        String currency,
        Boolean inStock,
        Integer stockCount,
        String imageUrl,
        String note,
        List<CatalogNode> children) {

    public enum Kind {
        GROUP,
        PART
    }
}
