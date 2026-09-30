package com.autoparts.hub.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.config.CorsRegistry;
import org.springframework.web.reactive.config.WebFluxConfigurer;

/**
 * The widgets are meant to be embedded on any shop page, so the API is
 * CORS-open for read traffic. On Railway the frontend is served from
 * GitHub Pages, hence the cross-origin setup.
 */
@Configuration(proxyBeanMethods = false)
public class WebConfig implements WebFluxConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "OPTIONS")
                .allowedHeaders("*")
                .maxAge(3600);
    }
}
