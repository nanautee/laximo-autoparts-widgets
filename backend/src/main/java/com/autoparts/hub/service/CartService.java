package com.autoparts.hub.service;

import com.autoparts.hub.client.abcp.AbcpCartClient;
import com.autoparts.hub.dto.CartRequest;
import com.autoparts.hub.dto.CartResult;
import com.autoparts.hub.error.ApiException;
import java.util.List;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

/**
 * "Add to cart" orchestration for the ABCP integration.
 *
 * <p>The widget posts what the visitor picked; this service validates the
 * basket and hands it to {@link AbcpCartClient}, which builds the ABCP request
 * body.
 *
 * <p>Note on prices: the client price is treated as a <em>display hint</em>.
 * ABCP resolves the final price and stock from its own catalogue, so the
 * simulated lines are only a preview of the request. A production build should
 * re-read prices from the catalogue (or ignore the client value entirely)
 * before confirming an order.
 */
@Service
public class CartService {

    private final AbcpCartClient abcp;

    public CartService(AbcpCartClient abcp) {
        this.abcp = abcp;
    }

    public Mono<CartResult> add(CartRequest request) {
        List<CartRequest.Item> items = request.items();
        if (items == null || items.isEmpty()) {
            throw ApiException.badRequest("CART_EMPTY", "Cart is empty",
                    "Add at least one part before sending the basket.");
        }
        for (CartRequest.Item item : items) {
            if (item.oem() == null || item.oem().isBlank()) {
                throw ApiException.badRequest("CART_ITEM_OEM", "Every item needs an OEM number",
                        "Parts are added by OEM number, which is how ABCP resolves suppliers.");
            }
        }
        return abcp.addToCart(request, AbcpCartClient.resolveLines(request));
    }
}
