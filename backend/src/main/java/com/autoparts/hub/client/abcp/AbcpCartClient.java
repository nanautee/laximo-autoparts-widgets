package com.autoparts.hub.client.abcp;

import com.autoparts.hub.config.AutopartsProperties;
import com.autoparts.hub.dto.CartRequest;
import com.autoparts.hub.dto.CartResult;
import com.autoparts.hub.error.ApiException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

/**
 * ABCP (Emex-compatible) cart integration.
 *
 * <p>The widget never talks to ABCP directly: it posts its selection to this
 * backend, which enriches it with prices/stock from the supplier side and
 * forwards it to the shop API. That keeps the ABCP key server-side and gives
 * one place to handle ABCP's rate limits.
 *
 * <p>Request shape (ABCP cart add / "change basket"):
 * <pre>{@code
 * POST {baseUrl}{cartPath}
 * Authorization: <api key>
 * {
 *   "sessionId": "widget-...",
 *   "clientType": "WWW",
 *   "items": [{ "oem": "...", "brand": "...", "name": "...",
 *               "quantity": 1, "price": 2450, "reference": "..." }]
 * }
 * }</pre>
 *
 * <p>When no API key is configured (public demo) the same payload is echoed back
 * with {@code mode = simulated} so the integration stays visible in the demo.
 */
@Component
public class AbcpCartClient {

    private static final Logger log = LoggerFactory.getLogger(AbcpCartClient.class);

    private final WebClient webClient;
    private final AutopartsProperties props;

    public AbcpCartClient(WebClient.Builder builder, AutopartsProperties props) {
        this.props = props;
        this.webClient = builder.build();
    }

    public boolean isLive() {
        return props.getAbcp().isConfigured();
    }

    /**
     * @param lines resolved line items (price / stock) produced by the backend
     */
    public Mono<CartResult> addToCart(CartRequest request, List<CartResult.Line> lines) {
        CartResult.AbcpPayload payload = buildPayload(request);
        if (!isLive()) {
            return Mono.just(simulate(request, lines, payload));
        }
        return webClient.post()
                .uri(props.getAbcp().getBaseUrl() + "/api/v1/cart/add")
                .header(HttpHeaders.AUTHORIZATION, props.getAbcp().getApiKey())
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .bodyValue(payload)
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(15))
                .map(body -> fromAbcpResponse(request, lines, payload, body))
                .onErrorMap(err -> {
                    log.warn("ABCP cart call failed: {}", err.toString());
                    return ApiException.upstream("ABCP cart request failed",
                            "Check ABCP credentials and rate limits in the test environment.");
                });
    }

    CartResult.AbcpPayload buildPayload(CartRequest request) {
        List<CartResult.AbcpItem> items = request.items().stream()
                .map(i -> new CartResult.AbcpItem(
                        i.oem(),
                        i.brand(),
                        i.name(),
                        i.quantity() == null ? 1 : i.quantity(),
                        i.price(),
                        i.vehicleId() == null ? null : "laximo:" + i.vehicleId()))
                .toList();
        return new CartResult.AbcpPayload(request.sessionId(), "WWW", items);
    }

    @SuppressWarnings("unchecked")
    private CartResult fromAbcpResponse(CartRequest request, List<CartResult.Line> lines,
                                        CartResult.AbcpPayload payload, Map<String, Object> body) {
        Integer itemsTotal = asInt(body.get("itemsTotal"));
        Integer total = asInt(body.get("totalAmount"));
        if (total == null) {
            total = lines.stream()
                    .filter(l -> l.price() != null && l.quantity() != null)
                    .mapToInt(l -> l.price() * l.quantity())
                    .sum();
        }
        return new CartResult(true, "abcp", request.sessionId(),
                itemsTotal != null ? itemsTotal : lines.size(), total, "RUB", lines, payload,
                "Корзина ABCP обновлена");
    }

    private CartResult simulate(CartRequest request, List<CartResult.Line> lines, CartResult.AbcpPayload payload) {
        int total = lines.stream()
                .filter(l -> l.price() != null && l.quantity() != null)
                .mapToInt(l -> l.price() * l.quantity())
                .sum();
        return new CartResult(true, "simulated", request.sessionId(), lines.size(), total, "RUB", lines, payload,
                "ABCP не сконфигурирован: показано сформированное тело запроса");
    }

    public static List<CartResult.Line> resolveLines(CartRequest request) {
        List<CartResult.Line> lines = new ArrayList<>();
        int qty = 0;
        int amount = 0;
        for (CartRequest.Item item : request.items()) {
            int quantity = item.quantity() == null ? 1 : item.quantity();
            int sum = item.price() == null ? 0 : item.price() * quantity;
            qty += quantity;
            amount += sum;
            lines.add(new CartResult.Line(item.oem(), item.brand(), item.name(), quantity, item.price(), sum,
                    Boolean.TRUE, "—"));
        }
        return lines;
    }

    private static Integer asInt(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String text) {
            try {
                return Integer.valueOf(text.replaceAll("[^0-9-]", ""));
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
}
