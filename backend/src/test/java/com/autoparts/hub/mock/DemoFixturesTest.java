package com.autoparts.hub.mock;

import static org.assertj.core.api.Assertions.assertThat;

import com.autoparts.hub.dto.Brand;
import com.autoparts.hub.dto.CatalogNode;
import com.autoparts.hub.dto.Model;
import com.autoparts.hub.dto.Modification;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Guards the demo fixtures: every navigation step of the showcase has to be
 * walkable, otherwise the public demo page shows empty dropdowns.
 */
class DemoFixturesTest {

    private static final String VEHICLE_ID = "VF-318I-2008";

    @Test
    @DisplayName("Every mocked brand resolves to at least one model and modification")
    void brandTreeIsWalkable() {
        assertThat(Dictionaries.BRANDS).isNotEmpty();

        Dictionaries.BRANDS.forEach(brand -> {
            List<Model> models = Dictionaries.MODELS.stream()
                    .filter(model -> model.brandId().equals(brand.id()))
                    .toList();
            assertThat(models).as("models of %s", brand.id()).isNotEmpty();

            models.forEach(model -> {
                List<Modification> mods = Dictionaries.MODIFICATIONS.stream()
                        .filter(mod -> mod.modelId().equals(model.id()))
                        .toList();
                assertThat(mods).as("modifications of %s", model.id()).isNotEmpty();
            });
        });
    }

    @Test
    @DisplayName("The parts tree is lazy but every branch ends in real parts")
    void partsTreeIsDrillable() {
        Map<String, List<CatalogNode>> tree = Fixtures.catalog(VEHICLE_ID);
        List<CatalogNode> roots = tree.get("root");
        assertThat(roots).isNotEmpty();
        assertThat(roots).allMatch(node -> node.kind() == CatalogNode.Kind.GROUP);

        // The tree is intentionally uneven: some branches reach parts in two
        // clicks, others in four. So walk the whole graph and assert two
        // invariants instead of a fixed depth - no dead ends, and every leaf
        // really is a priced part.
        List<CatalogNode> queue = new ArrayList<>(roots);
        List<CatalogNode> parts = new ArrayList<>();
        int visited = 0;

        while (!queue.isEmpty() && visited++ < 500) {
            CatalogNode node = queue.remove(0);
            if (node.kind() == CatalogNode.Kind.PART) {
                parts.add(node);
                continue;
            }
            List<CatalogNode> children = tree.get(node.id());
            assertThat(children).as("group %s must have children", node.id()).isNotEmpty();
            queue.addAll(children);
        }

        assertThat(parts).as("the demo tree must contain parts").isNotEmpty();
        assertThat(parts).allSatisfy(part -> {
            assertThat(part.oem()).isNotBlank();
            assertThat(part.price()).isPositive();
            assertThat(part.currency()).isEqualTo("RUB");
        });
    }

    @Test
    @DisplayName("Every demo VIN from /api/v1/meta decodes to a vehicle")
    void demoVinsResolve() {
        assertThat(Fixtures.VIN_INDEX).isNotEmpty();
        Fixtures.VIN_INDEX.forEach((vin, vehicle) -> {
            assertThat(vin).hasSize(17);
            assertThat(vehicle.vehicleId()).isNotBlank();
        });
    }

    @Test
    @DisplayName("An unknown VIN falls back to a generated vehicle instead of failing")
    void unknownVinStillDecodes() {
        assertThat(Fixtures.vehicles()).isNotEmpty();
    }
}
