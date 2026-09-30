package com.autoparts.hub.controller;

import com.autoparts.hub.dto.Brand;
import com.autoparts.hub.dto.Modification;
import com.autoparts.hub.dto.Model;
import com.autoparts.hub.dto.ResponseMeta;
import com.autoparts.hub.service.CatalogService;
import com.autoparts.hub.service.ServiceResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/catalog")
@Tag(name = "Catalog", description = "Brand -> model -> year -> modification navigation")
public class CatalogController {

    private final CatalogService catalog;

    public CatalogController(CatalogService catalog) {
        this.catalog = catalog;
    }

    @GetMapping("/brands")
    @Operation(summary = "Brand list", description = "Cached for 30 days; supports a server-side search term")
    public Mono<ResponseEntity<ListResponse<Brand>>> brands(
            @Parameter(description = "Optional brand name filter")
            @RequestParam(value = "q", required = false) String query) {
        return catalog.brands(query).map(CatalogController::respond);
    }

    @GetMapping("/brands/{brandId}/models")
    @Operation(summary = "Models of a brand", description = "Cached for 14 days, includes available years")
    public Mono<ResponseEntity<ListResponse<Model>>> models(@PathVariable String brandId) {
        return catalog.models(brandId).map(CatalogController::respond);
    }

    @GetMapping("/models/{modelId}/modifications")
    @Operation(summary = "Modifications of a model",
            description = "Year/variant level; the last step before the parts tree")
    public Mono<ResponseEntity<ListResponse<Modification>>> modifications(@PathVariable String modelId) {
        return catalog.modifications(modelId).map(CatalogController::respond);
    }

    public record ListResponse<T>(List<T> items, int count, ResponseMeta meta) {
    }

    private static <T> ResponseEntity<ListResponse<T>> respond(ServiceResult<List<T>> result) {
        ResponseMeta meta = result.meta();
        return ResponseEntity.ok()
                .header("X-Cache", meta.cache())
                .header("X-Source", meta.source())
                .body(new ListResponse<>(result.data(), result.data().size(), meta));
    }
}
