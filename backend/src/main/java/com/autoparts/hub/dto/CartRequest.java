package com.autoparts.hub.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

/**
 * Cart request coming from a widget. The same payload is what the backend
 * forwards to the ABCP test environment.
 */
public record CartRequest(
        @NotBlank String sessionId,
        @Valid @NotEmpty List<Item> items) {

    /**
     * @param oem       OEM number of the part (ABCP resolves suppliers by it)
     * @param brand     preferred supplier brand, nullable
     * @param name      human readable part name shown in the cart
     * @param quantity  units to add
     * @param price     widget price, informational
     * @param vehicleId Laximo vehicle id the part was picked for
     */
    public record Item(
            @NotBlank String oem,
            String brand,
            String name,
            @Min(1) Integer quantity,
            Integer price,
            String vehicleId) {
    }
}
