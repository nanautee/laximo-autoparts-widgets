package com.autoparts.hub.client.laximo;

import com.autoparts.hub.config.AutopartsProperties;
import com.autoparts.hub.dto.Brand;
import com.autoparts.hub.dto.CatalogNode;
import com.autoparts.hub.dto.Modification;
import com.autoparts.hub.dto.Model;
import com.autoparts.hub.dto.OemSearchResult;
import com.autoparts.hub.dto.Vehicle;
import com.autoparts.hub.error.ApiException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

/**
 * Real Laximo integration, active when {@code autoparts.mock.enabled=false}.
 *
 * <p>Operations used (AXAM SOAP service):
 * <ul>
 *   <li>{@code getVehicleListByVin} - VIN decoding</li>
 *   <li>{@code getBrandList} / {@code getModelList} - catalog dictionaries</li>
 *   <li>{@code getModificationList} - year + variant selection</li>
 *   <li>{@code getGroupTree} / {@code getPartsByGroup} - parts tree</li>
 *   <li>{@code getCrossReference} - OEM lookup with analogues</li>
 * </ul>
 */
@Service
@ConditionalOnProperty(name = "autoparts.mock.enabled", havingValue = "false")
public class LaximoSoapClient implements LaximoGateway {

    private final LaximoSoapTransport transport;
    private final AutopartsProperties props;

    public LaximoSoapClient(LaximoSoapTransport transport, AutopartsProperties props) {
        this.transport = transport;
        this.props = props;
    }

    @Override
    public String sourceName() {
        return "laximo";
    }

    @Override
    public Mono<Vehicle> decodeVin(String vin) {
        String params = "<axam:vin>%s</axam:vin>".formatted(Xml.escape(vin));
        return transport.call("getVehicleListByVin", params).map(body -> {
            List<org.w3c.dom.Node> vehicles = Xml.descendants(body, "vehicle");
            if (vehicles.isEmpty()) {
                throw ApiException.notFound("VIN not recognised: " + vin,
                        "Check for typos. Laximo covers passenger cars and light commercial vehicles only.");
            }
            return toVehicle(vehicles.get(0), vin);
        });
    }

    @Override
    public Mono<List<Brand>> brands(String query) {
        return transport.call("getBrandList", "").map(body -> {
            List<Brand> result = new ArrayList<>();
            for (org.w3c.dom.Node node : Xml.descendants(body, "brand")) {
                String id = Xml.attr(node, "id");
                String name = Xml.text(node, "name") != null ? Xml.text(node, "name") : Xml.attr(node, "name");
                if (id == null || name == null) {
                    continue;
                }
                Brand brand = new Brand(id, name, Xml.attr(node, "country"));
                if (query == null || query.isBlank()
                        || name.toLowerCase(Locale.ROOT).contains(query.toLowerCase(Locale.ROOT))) {
                    result.add(brand);
                }
            }
            return result;
        });
    }

    @Override
    public Mono<List<Model>> models(String brandId) {
        String params = "<axam:brandId>%s</axam:brandId>".formatted(Xml.escape(brandId));
        return transport.call("getModelList", params).map(body -> {
            List<Model> result = new ArrayList<>();
            for (org.w3c.dom.Node node : Xml.descendants(body, "model")) {
                String id = Xml.attr(node, "id");
                if (id == null) {
                    continue;
                }
                List<Integer> years = new ArrayList<>();
                for (org.w3c.dom.Node y : Xml.children(node, "year")) {
                    Integer value = Xml.integer(y, "value");
                    if (value != null) {
                        years.add(value);
                    }
                }
                result.add(new Model(id, brandId, Xml.attr(node, "name"), years,
                        Xml.children(node, "modification").size()));
            }
            return result;
        });
    }

    @Override
    public Mono<List<Modification>> modifications(String modelId) {
        String params = "<axam:modelId>%s</axam:modelId>".formatted(Xml.escape(modelId));
        return transport.call("getModificationList", params).map(body -> {
            List<Modification> result = new ArrayList<>();
            for (org.w3c.dom.Node node : Xml.descendants(body, "modification")) {
                String id = Xml.attr(node, "id");
                if (id == null) {
                    continue;
                }
                result.add(new Modification(
                        id,
                        modelId,
                        Xml.attr(node, "name"),
                        Xml.integer(node, "yearFrom"),
                        Xml.integer(node, "yearTo"),
                        Xml.text(node, "engine"),
                        Xml.text(node, "fuel"),
                        Xml.text(node, "gearbox"),
                        Xml.text(node, "drive"),
                        Xml.text(node, "body"),
                        Xml.text(node, "power"),
                        Xml.attr(node, "platformId")));
            }
            return result;
        });
    }

    @Override
    public Mono<List<CatalogNode>> catalog(String vehicleId, String groupId) {
        String params = "<axam:vehicleId>%s</axam:vehicleId>%s".formatted(
                Xml.escape(vehicleId),
                groupId == null ? "" : "<axam:groupId>%s</axam:groupId>".formatted(Xml.escape(groupId)));
        return transport.call("getGroupTree", params).map(body -> mapGroups(body, 0));
    }

    @Override
    public Mono<OemSearchResult> searchOem(String oem) {
        String params = "<axam:oem>%s</axam:oem>".formatted(Xml.escape(oem));
        return transport.call("getCrossReference", params).map(body -> {
            org.w3c.dom.Node primary = Xml.descendant(body, "part");
            String brand = Xml.text(primary, "brand", "name");
            String name = Xml.text(primary, "name");
            if (primary == null) {
                throw ApiException.notFound("OEM number not found: " + oem,
                        "Try the number without spaces, dashes or country prefixes.");
            }
            List<OemSearchResult.CrossPart> crosses = new ArrayList<>();
            for (org.w3c.dom.Node node : Xml.descendants(body, "crossPart")) {
                Integer stock = Xml.integer(node, "stock", "count");
                crosses.add(new OemSearchResult.CrossPart(
                        Xml.attr(node, "oem"),
                        Xml.text(node, "brand", "name"),
                        Xml.text(node, "name"),
                        Xml.integer(node, "price", "value"),
                        Xml.attr(node, "currency") != null ? Xml.attr(node, "currency") : "RUB",
                        stock != null && stock > 0,
                        Boolean.parseBoolean(Xml.attr(node, "original")),
                        Xml.attr(node, "supplier")));
            }
            List<OemSearchResult.Applicability> applicability = new ArrayList<>();
            for (org.w3c.dom.Node node : Xml.descendants(body, "applicability")) {
                applicability.add(new OemSearchResult.Applicability(
                        Xml.text(node, "brand", "name"),
                        Xml.text(node, "model", "name"),
                        Xml.text(node, "modification", "name"),
                        Xml.attr(node, "yearRange"),
                        Xml.attr(node, "note")));
            }
            Integer minPrice = crosses.stream()
                    .map(OemSearchResult.CrossPart::price)
                    .filter(java.util.Objects::nonNull)
                    .min(Integer::compareTo)
                    .orElse(null);
            return new OemSearchResult(oem, brand, name, Xml.attr(primary, "ean"),
                    Xml.text(primary, "category"), Xml.attr(primary, "note"), crosses, applicability,
                    minPrice, "RUB");
        });
    }

    private Vehicle toVehicle(org.w3c.dom.Node node, String vin) {
        return new Vehicle(
                Xml.attr(node, "id"),
                Xml.attr(node, "vin") != null ? Xml.attr(node, "vin") : vin,
                Xml.text(node, "brand", "name"),
                Xml.text(node, "model", "name"),
                Xml.text(node, "modification", "name"),
                Xml.integer(node, "modification", "year"),
                Xml.text(node, "engine", "name"),
                Xml.text(node, "engine", "fuel"),
                Xml.text(node, "gearbox", "name"),
                Xml.text(node, "drive", "name"),
                Xml.text(node, "body", "name"),
                Xml.text(node, "modification", "power"),
                Xml.text(node, "brand", "country"),
                props.getLaximo().getMarket(),
                Xml.text(node, "image"),
                List.of());
    }

    /** Recursive group -> part mapping, depth-limited to keep payloads sane. */
    private List<CatalogNode> mapGroups(org.w3c.dom.Node parent, int depth) {
        List<CatalogNode> nodes = new ArrayList<>();
        if (depth > 4) {
            return nodes;
        }
        for (org.w3c.dom.Node group : Xml.children(parent, "group")) {
            String id = Xml.attr(group, "id");
            String name = Xml.attr(group, "name");
            if (id == null || name == null) {
                continue;
            }
            List<CatalogNode> children = mapGroups(group, depth + 1);
            if (children.isEmpty()) {
                for (org.w3c.dom.Node part : Xml.children(group, "part")) {
                    children.add(toPart(part, depth));
                }
            }
            nodes.add(new CatalogNode(id, CatalogNode.Kind.GROUP, name, null, null, null, null, null, null, null,
                    null, null, null, children));
        }
        return nodes;
    }

    private CatalogNode toPart(org.w3c.dom.Node part, int depth) {
        Integer stock = Xml.integer(part, "stock", "count");
        return new CatalogNode(
                Xml.attr(part, "id") != null ? Xml.attr(part, "id") : Xml.attr(part, "oem"),
                CatalogNode.Kind.PART,
                Xml.text(part, "name"),
                null,
                Xml.attr(part, "oem"),
                Xml.text(part, "brand", "name"),
                Xml.attr(part, "ean"),
                Xml.integer(part, "price", "value"),
                Xml.attr(part, "currency") != null ? Xml.attr(part, "currency") : "RUB",
                stock != null && stock > 0,
                stock,
                Xml.text(part, "image"),
                Xml.attr(part, "note"),
                depth > 4 ? List.of() : List.of());
    }
}
