package com.autoparts.hub.controller;

import com.autoparts.hub.config.AutopartsProperties;
import com.autoparts.hub.dto.CartRequest;
import com.autoparts.hub.dto.CartResult;
import com.autoparts.hub.service.CartService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/cart")
@Tag(name = "Cart", description = "ABCP basket integration")
public class CartController {

    private final CartService cart;
    private final AutopartsProperties props;

    public CartController(CartService cart, AutopartsProperties props) {
        this.cart = cart;
        this.props = props;
    }

    @PostMapping("/add")
    @Operation(summary = "Add parts to the ABCP basket",
            description = "Builds the ABCP request body from the widget selection and forwards it to "
                    + "the shop API. The response echoes the exact payload so the integration can be "
                    + "verified against the customer's test environment. Without credentials the call is "
                    + "simulated (mode = simulated).")
    public Mono<CartResult> add(@Valid @RequestBody CartRequest request) {
        return cart.add(request);
    }

    @GetMapping("/status")
    @Operation(summary = "Cart integration status", description = "Tells the widget whether the live ABCP channel is active")
    public Mono<Status> status() {
        return Mono.just(new Status(
                props.getAbcp().isConfigured() ? "abcp" : "simulated",
                props.getAbcp().getBaseUrl(),
                props.getAbcp().isConfigured(),
                props.getMock().isEnabled() ? "mock" : "laximo"));
    }

    public record Status(String mode, String baseUrl, boolean live, String dataSource) {
    }
}
