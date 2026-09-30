package com.autoparts.hub.controller;

import com.autoparts.hub.config.AutopartsProperties;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/meta")
@Tag(name = "Meta", description = "Runtime configuration exposed to the widgets")
public class MetaController {

    /** Test VINs supplied with the brief, shown as one-click examples in the demo. */
    private static final List<Map<String, String>> TEST_VINS = List.of(
            Map.of("vin", "WBAVA51070FH12345", "vehicle", "BMW 3 series (E90/E91) 320i, 2008"),
            Map.of("vin", "WBAVA51050FH54321", "vehicle", "BMW 3 series (E90/E91) 325i, 2011"),
            Map.of("vin", "WBA8B11060F123456", "vehicle", "BMW 3 series (E90/E91) 320d, 2010"),
            Map.of("vin", "WDD2050548L123456", "vehicle", "Mercedes-Benz C-class (W204) C200, 2012"),
            Map.of("vin", "WVWZZZ1KZAW000001", "vehicle", "Volkswagen Golf V 1.4 TSI, 2010"),
            Map.of("vin", "JTNB11HK303012345", "vehicle", "Toyota Camry (XV50) 2.0, 2014"),
            Map.of("vin", "X4LSSABAAEN123456", "vehicle", "Lada Vesta 1.6, 2016"),
            Map.of("vin", "TMBJJ7NE0K0123456", "vehicle", "Skoda Octavia III 2.0 TDI, 2015"));

    private static final List<Map<String, String>> TEST_OEM = List.of(
            Map.of("number", "34116860114", "part", "Диск тормозной задний (BMW)"),
            Map.of("number", "34216870690", "part", "Колодки тормозные передние (ATE)"),
            Map.of("number", "11427575945", "part", "Масляный фильтр (BMW)"),
            Map.of("number", "000915105CE", "part", "Аккумулятор 90Ah (BMW)"),
            Map.of("number", "11127529817", "part", "Прокладка ГБЦ (BMW)"));

    private final AutopartsProperties props;

    public MetaController(AutopartsProperties props) {
        this.props = props;
    }

    @GetMapping
    @Operation(summary = "Runtime configuration and demo fixtures",
            description = "Lets the demo page show the active mode, the cache TTLs in use and one-click "
                    + "test VIN / OEM examples.")
    public Mono<Info> info() {
        AutopartsProperties.Ttl ttl = props.getCache().getTtl();
        return Mono.just(new Info(
                props.getMock().isEnabled() ? "mock" : "laximo",
                props.getAbcp().isConfigured() ? "abcp" : "simulated",
                props.getCache().isEnabled(),
                List.of(
                        new TtlInfo("vin", human(ttl.getVinDecode())),
                        new TtlInfo("brands", human(ttl.getBrands())),
                        new TtlInfo("models", human(ttl.getModels())),
                        new TtlInfo("modifications", human(ttl.getModifications())),
                        new TtlInfo("catalog", human(ttl.getCatalog())),
                        new TtlInfo("oem", human(ttl.getCross()))),
                TEST_VINS,
                TEST_OEM));
    }

    public record Info(String dataSource, String cartMode, boolean cacheEnabled,
                       List<TtlInfo> cacheTtl, List<Map<String, String>> testVins,
                       List<Map<String, String>> testOemNumbers) {
    }

    /** Renders a TTL as {@code "72h"} / {@code "30d"} for the demo UI. */
    private static String human(Duration ttl) {
        if (ttl == null) {
            return "n/a";
        }
        long hours = ttl.toHours();
        if (hours >= 48 && hours % 24 == 0) {
            return (hours / 24) + "d";
        }
        if (hours >= 1) {
            return hours + "h";
        }
        return ttl.toMinutes() + "m";
    }

    /**
     * Serialised as {@code "72h"} / {@code "30d"} rather than Jackson's default
     * {@code {seconds, nano, ...}} object, which is unreadable in the demo UI.
     */
    public record TtlInfo(String namespace, String ttl) {
    }
}
