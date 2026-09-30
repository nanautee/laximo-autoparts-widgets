package com.autoparts.hub.controller;

import com.autoparts.hub.dto.OemSearchResult;
import com.autoparts.hub.dto.ResponseMeta;
import com.autoparts.hub.service.OemService;
import com.autoparts.hub.service.ServiceResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/oem")
@Tag(name = "OEM", description = "OEM number lookup, cross numbers and applicability")
public class OemController {

    private final OemService oem;

    public OemController(OemService oem) {
        this.oem = oem;
    }

    @GetMapping("/search")
    @Operation(summary = "Search by OEM number",
            description = "Returns the matched part, its cross numbers / analogues with price and "
                    + "stock, and the vehicles it applies to. The number is normalised before the "
                    + "cache lookup, so 3411-686-0114 and 34116860114 share one entry (TTL 6 h).")
    public Mono<ResponseEntity<SearchResponse>> search(
            @Parameter(description = "OEM / original equipment number", example = "34116860114")
            @RequestParam("number") String number) {
        return oem.search(number).map(result -> {
            ResponseMeta meta = result.meta();
            return ResponseEntity.ok()
                    .header("X-Cache", meta.cache())
                    .header("X-Source", meta.source())
                    .body(new SearchResponse(result.data(), meta));
        });
    }

    public record SearchResponse(OemSearchResult result, ResponseMeta meta) {
    }
}
