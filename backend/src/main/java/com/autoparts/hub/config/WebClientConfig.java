package com.autoparts.hub.config;

import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

@Configuration(proxyBeanMethods = false)
public class WebClientConfig {

    /**
     * A single {@link WebClient} is shared for both the Laximo SOAP envelopes and
     * the ABCP REST calls. Connection pooling plus sane timeouts matter here:
     * upstream SOAP calls regularly take 1-3 seconds.
     */
    @Bean
    public WebClient.Builder webClientBuilder(AutopartsProperties props) {
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, props.getLaximo().getConnectTimeoutMs())
                .doOnConnected(conn -> conn.addHandlerLast(
                        new ReadTimeoutHandler(props.getLaximo().getReadTimeoutMs())));
        return WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .codecs(c -> c.defaultCodecs().maxInMemorySize(8 * 1024 * 1024));
    }
}
