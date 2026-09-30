package com.autoparts.hub.controller;

import com.autoparts.hub.dto.CatalogNode;
import com.autoparts.hub.dto.ResponseMeta;
import com.autoparts.hub.dto.Vehicle;
import com.autoparts.hub.service.ServiceResult;
import com.autoparts.hub.service.VehicleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/vehicles")
@Tag(name = "Vehicles", description = "VIN decoding and the parts tree of a vehicle")
public class VehicleController {

    private final VehicleService vehicles;

    public VehicleController(VehicleService vehicles) {
        this.vehicles = vehicles;
    }

    @GetMapping("/decode")
    @Operation(summary = "Decode a VIN",
            description = "Decodes a 17-character VIN through Laximo and returns the vehicle card "
                    + "with the root of the parts tree. Cached for 72 h.")
    public Mono<ResponseEntity<VehicleResponse>> decode(
            @Parameter(description = "Vehicle identification number")
            @RequestParam("vin") String vin) {
        return vehicles.decodeVin(vin).map(VehicleController::toResponse);
    }

    @GetMapping("/{vehicleId}/catalog")
    @Operation(summary = "Parts tree level",
            description = "Returns one level of the parts tree. Call without groupId for the root, "
                    + "then drill down. Cached per vehicle and group for 7 days.")
    public Mono<ResponseEntity<CatalogResponse>> catalog(
            @PathVariable String vehicleId,
            @Parameter(description = "Parent group id, omit for the root level")
            @RequestParam(value = "groupId", required = false) String groupId) {
        return vehicles.catalog(vehicleId, groupId)
                .map(result -> ResponseEntity.ok()
                        .header("X-Cache", result.meta().cache())
                        .header("X-Source", result.meta().source())
                        .body(new CatalogResponse(vehicleId, groupId, result.data(), result.meta())));
    }

    public record VehicleResponse(Vehicle vehicle, List<CatalogNode> groups, ResponseMeta meta) {
    }

    public record CatalogResponse(String vehicleId, String groupId, List<CatalogNode> groups, ResponseMeta meta) {
    }

    private static ResponseEntity<VehicleResponse> toResponse(ServiceResult<VehicleService.VinDecodeResult> result) {
        ResponseMeta meta = result.meta();
        return ResponseEntity.ok()
                .header("X-Cache", meta.cache())
                .header("X-Source", meta.source())
                .body(new VehicleResponse(result.data().vehicle(), result.data().groups(), meta));
    }
}
