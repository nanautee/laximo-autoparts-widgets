package com.autoparts.hub.client.laximo;

import com.autoparts.hub.dto.Brand;
import com.autoparts.hub.dto.CatalogNode;
import com.autoparts.hub.dto.Modification;
import com.autoparts.hub.dto.Model;
import com.autoparts.hub.dto.OemSearchResult;
import com.autoparts.hub.dto.Vehicle;
import java.util.List;
import reactor.core.publisher.Mono;

/**
 * Anti-corruption layer over the Laximo catalog API.
 *
 * <p>Two implementations exist: {@link LaximoSoapClient} (real SOAP calls) and
 * {@code MockLaximoGateway} (bundled fixtures). Services only ever see this
 * interface, which keeps the vendor's XML model out of the business logic.
 */
public interface LaximoGateway {

    /** Identifies the active backend in {@code ResponseMeta.source}. */
    String sourceName();

    /** Decodes a 17-character VIN into a vehicle identity. */
    Mono<Vehicle> decodeVin(String vin);

    /** Brand dictionary, optionally filtered by a search term. */
    Mono<List<Brand>> brands(String query);

    /** Models of a brand. */
    Mono<List<Model>> models(String brandId);

    /** Year/modification list of a model. */
    Mono<List<Modification>> modifications(String modelId);

    /**
     * Part tree of a vehicle.
     *
     * @param vehicleId Laximo vehicle id
     * @param groupId   parent group, {@code null} for the root level
     */
    Mono<List<CatalogNode>> catalog(String vehicleId, String groupId);

    /** OEM number lookup with cross references and applicability. */
    Mono<OemSearchResult> searchOem(String oem);
}
