package com.autoparts.hub;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.autoparts.hub.error.ApiException;
import com.autoparts.hub.service.OemService;
import com.autoparts.hub.service.VehicleService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class VinAndOemNormalizationTest {

    @Test
    @DisplayName("VIN is upper-cased and separators are removed")
    void normalizesVin() {
        assertThat(VehicleService.normalizeVin("wba va510-70fh12345")).isEqualTo("WBAVA51070FH12345");
    }

    @ParameterizedTest
    @CsvSource({
            "WBAVA51070FH12345",
            "X4LSSABAAEN123456"
    })
    @DisplayName("A 17-character VIN is accepted")
    void acceptsValidVin(String vin) {
        assertThat(VehicleService.normalizeVin(vin)).hasSize(17);
    }

    @ParameterizedTest
    @CsvSource({
            "short, 5",
            "WBAVA51070FH1234, 16",
            "WBAVA51070FH123456, 18"
    })
    @DisplayName("VIN length is validated before any paid upstream call")
    void rejectsWrongLength(String vin, int length) {
        assertThatThrownBy(() -> VehicleService.normalizeVin(vin))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("VIN must be exactly 17 characters, got " + length);
    }

    @Test
    @DisplayName("Letters outside the VIN alphabet are rejected")
    void rejectsInvalidAlphabet() {
        assertThatThrownBy(() -> VehicleService.normalizeVin("WBAVA51070FI12345"))
                .hasMessageContaining("I, O or Q");
    }

    @Test
    @DisplayName("OEM variants collapse to the same cache key")
    void normalizesOem() {
        assertThat(OemService.normalize("3411-686-0114"))
                .isEqualTo(OemService.normalize(" 341168601 14 "))
                .isEqualTo("34116860114");
    }

    @Test
    @DisplayName("Too short OEM numbers are rejected")
    void rejectsShortOem() {
        assertThatThrownBy(() -> OemService.normalize("12")).isInstanceOf(RuntimeException.class);
    }
}
