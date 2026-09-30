package com.autoparts.hub.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class OpenApiConfig {

    @Bean
    public OpenAPI openApi(@Value("${server.port:8080}") int port) {
        return new OpenAPI()
                .info(new Info()
                        .title("Autoparts Hub API")
                        .version("1.0.0")
                        .description("""
                                Normalised backend for Laximo-powered auto parts lookup widgets.

                                * `/api/v1/vehicles` - VIN decode, vehicle card, part group tree
                                * `/api/v1/catalog` - brand -> model -> year -> modification navigation
                                * `/api/v1/oem` - OEM number search, cross numbers, applicability
                                * `/api/v1/cart` - ABCP cart payload builder

                                Every Laximo call is served through Redis to keep the paid API bill down.
                                Responses carry `X-Cache: HIT|MISS|BYPASS` so cache behaviour is observable.
                                """)
                        .contact(new Contact().name("Autoparts Widgets Demo"))
                        .license(new License().name("MIT")))
                .servers(List.of(new Server().url("/").description("Current host")));
    }
}
