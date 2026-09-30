package com.autoparts.hub.config;

import com.autoparts.hub.cache.JsonCacheService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.ReactiveRedisConnectionFactory;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;

@Configuration(proxyBeanMethods = false)
public class CacheConfig {

    @Bean
    public ReactiveStringRedisTemplate reactiveStringRedisTemplate(ReactiveRedisConnectionFactory factory) {
        return new ReactiveStringRedisTemplate(factory);
    }

    @Bean
    public JsonCacheService jsonCacheService(ReactiveStringRedisTemplate redis,
                                            ObjectMapper mapper,
                                            AutopartsProperties props) {
        return new JsonCacheService(redis, mapper, props);
    }
}
