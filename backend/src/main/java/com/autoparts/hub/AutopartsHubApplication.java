package com.autoparts.hub;

import com.autoparts.hub.config.AutopartsProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(AutopartsProperties.class)
public class AutopartsHubApplication {

    public static void main(String[] args) {
        SpringApplication.run(AutopartsHubApplication.class, args);
    }
}
