package com.autoparts.hub.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Strongly typed view over the {@code autoparts.*} configuration tree.
 */
@ConfigurationProperties(prefix = "autoparts")
public class AutopartsProperties {

    private final Mock mock = new Mock();
    private final Laximo laximo = new Laximo();
    private final Abcp abcp = new Abcp();
    private final Cache cache = new Cache();

    public Mock getMock() {
        return mock;
    }

    public Laximo getLaximo() {
        return laximo;
    }

    public Abcp getAbcp() {
        return abcp;
    }

    public Cache getCache() {
        return cache;
    }

    public static class Mock {
        /** Serves bundled fixtures instead of calling Laximo. */
        private boolean enabled = true;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }
    }

    public static class Laximo {
        private String endpoint = "https://axam.laximo.com/soap/";
        private String username = "";
        private String password = "";
        private String market = "RU";
        private String tradeId = "";
        private int connectTimeoutMs = 8000;
        private int readTimeoutMs = 20000;

        public String getEndpoint() {
            return endpoint;
        }

        public void setEndpoint(String endpoint) {
            this.endpoint = endpoint;
        }

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }

        public String getMarket() {
            return market;
        }

        public void setMarket(String market) {
            this.market = market;
        }

        public String getTradeId() {
            return tradeId;
        }

        public void setTradeId(String tradeId) {
            this.tradeId = tradeId;
        }

        public int getConnectTimeoutMs() {
            return connectTimeoutMs;
        }

        public void setConnectTimeoutMs(int connectTimeoutMs) {
            this.connectTimeoutMs = connectTimeoutMs;
        }

        public int getReadTimeoutMs() {
            return readTimeoutMs;
        }

        public void setReadTimeoutMs(int readTimeoutMs) {
            this.readTimeoutMs = readTimeoutMs;
        }

        public boolean isConfigured() {
            return username != null && !username.isBlank() && tradeId != null && !tradeId.isBlank();
        }
    }

    public static class Abcp {
        private String apiKey = "";
        private String baseUrl = "https://api.abcp.ru";
        private boolean enabled = true;

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
        }

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public boolean isConfigured() {
            return enabled && apiKey != null && !apiKey.isBlank();
        }
    }

    public static class Cache {
        private boolean enabled = true;
        private String keyPrefix = "autoparts:";
        private final Ttl ttl = new Ttl();

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getKeyPrefix() {
            return keyPrefix;
        }

        public void setKeyPrefix(String keyPrefix) {
            this.keyPrefix = keyPrefix;
        }

        public Ttl getTtl() {
            return ttl;
        }
    }

    /**
     * TTLs are deliberately split by data volatility. Laximo bills every SOAP
     * call, therefore stable dictionaries are cached much longer than
     * cross-reference data.
     */
    public static class Ttl {
        private Duration vinDecode = Duration.ofHours(72);
        private Duration brands = Duration.ofDays(30);
        private Duration models = Duration.ofDays(14);
        private Duration modifications = Duration.ofDays(14);
        private Duration catalog = Duration.ofDays(7);
        private Duration oemSearch = Duration.ofHours(24);
        private Duration cross = Duration.ofHours(6);

        public Duration getVinDecode() {
            return vinDecode;
        }

        public void setVinDecode(Duration vinDecode) {
            this.vinDecode = vinDecode;
        }

        public Duration getBrands() {
            return brands;
        }

        public void setBrands(Duration brands) {
            this.brands = brands;
        }

        public Duration getModels() {
            return models;
        }

        public void setModels(Duration models) {
            this.models = models;
        }

        public Duration getModifications() {
            return modifications;
        }

        public void setModifications(Duration modifications) {
            this.modifications = modifications;
        }

        public Duration getCatalog() {
            return catalog;
        }

        public void setCatalog(Duration catalog) {
            this.catalog = catalog;
        }

        public Duration getOemSearch() {
            return oemSearch;
        }

        public void setOemSearch(Duration oemSearch) {
            this.oemSearch = oemSearch;
        }

        public Duration getCross() {
            return cross;
        }

        public void setCross(Duration cross) {
            this.cross = cross;
        }
    }
}
