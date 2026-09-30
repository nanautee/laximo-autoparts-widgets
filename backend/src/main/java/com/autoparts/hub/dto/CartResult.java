package com.autoparts.hub.dto;

import java.util.List;

/**
 * Result of an "add to cart" call. {@code request} is the exact JSON that is
 * sent to ABCP, which makes the integration visible in the demo and easy to
 * compare with the customer's test environment.
 */
public record CartResult(
        boolean success,
        String mode,
        String sessionId,
        Integer itemsTotal,
        Integer totalAmount,
        String currency,
        List<Line> lines,
        AbcpPayload request,
        String message) {

    public record Line(
            String oem,
            String brand,
            String name,
            Integer quantity,
            Integer price,
            Integer amount,
            Boolean inStock,
            String supplier) {
    }

    /**
     * ABCP (Emex-compatible) add-to-basket request body. ABCP identifies a part
     * either by {@code oem} + {@code brand} or by {@code sku}; the widget path
     * uses the OEM pair because it is what the visitor picked.
     */
    public record AbcpPayload(
            String sessionId,
            String clientType,
            List<AbcpItem> items) {
    }

    public record AbcpItem(
            String oem,
            String brand,
            String name,
            Integer quantity,
            Integer price,
            String reference) {
    }
}
