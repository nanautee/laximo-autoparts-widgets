package com.autoparts.hub.client.laximo;

import com.autoparts.hub.config.AutopartsProperties;
import com.autoparts.hub.error.ApiException;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

/**
 * Minimal SOAP 1.1 client for the Laximo AXAM services.
 *
 * <p>Laximo ships WSDLs together with the paid account, so the operations are
 * addressed by name instead of generated stubs - that keeps the artifact small
 * and makes the request/response XML visible in the code.
 *
 * <p>Typical envelope:
 * <pre>{@code
 * <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
 *                   xmlns:axam="http://laximo.com/axam/">
 *   <soapenv:Header>
 *     <axam:tradeId>...</axam:tradeId>
 *     <axam:market>RU</axam:market>
 *   </soapenv:Header>
 *   <soapenv:Body>
 *     <axam:getVehicleListByVin><axam:vin>...</axam:vin></axam:getVehicleListByVin>
 *   </soapenv:Body>
 * </soapenv:Envelope>
 * }</pre>
 */
@Component
public class LaximoSoapTransport {

    private static final Logger log = LoggerFactory.getLogger(LaximoSoapTransport.class);
    private static final String NS = "http://laximo.com/axam/";

    private final WebClient webClient;
    private final AutopartsProperties props;

    public LaximoSoapTransport(WebClient.Builder builder, AutopartsProperties props) {
        this.props = props;
        this.webClient = builder.baseUrl(props.getLaximo().getEndpoint()).build();
    }

    /**
     * Invokes a Laximo operation and returns the first child of the SOAP body.
     */
    public Mono<org.w3c.dom.Node> call(String operation, String bodyParams) {
        if (!props.getLaximo().isConfigured()) {
            return Mono.error(ApiException.notConfigured(
                    "Laximo credentials are not configured",
                    "Set LAXIMO_USERNAME / LAXIMO_PASSWORD / LAXIMO_TRADE_ID, or enable MOCK_ENABLED=true."));
        }
        String envelope = """
                <?xml version="1.0" encoding="UTF-8"?>
                <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:axam="%s">
                  <soapenv:Header>
                    <axam:tradeId>%s</axam:tradeId>
                    <axam:market>%s</axam:market>
                  </soapenv:Header>
                  <soapenv:Body>
                    <axam:%s>%s</axam:%s>
                  </soapenv:Body>
                </soapenv:Envelope>
                """.formatted(NS, Xml.escape(props.getLaximo().getTradeId()),
                Xml.escape(props.getLaximo().getMarket()), operation, bodyParams, operation);

        return webClient.post()
                .contentType(MediaType.TEXT_XML)
                .accept(MediaType.TEXT_XML)
                .bodyValue(envelope)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofMillis(props.getLaximo().getReadTimeoutMs()))
                .map(this::parseBody)
                .flatMap(node -> Mono.justOrEmpty(firstElement(node, operation + "Response")))
                .switchIfEmpty(Mono.error(ApiException.upstream(
                        "Laximo returned an empty response for " + operation,
                        "Verify the market code and the trade account limits.")))
                .doOnError(err -> log.warn("Laximo SOAP call {} failed: {}", operation, err.toString()))
                .onErrorMap(err -> err instanceof ApiException ? err
                        : ApiException.upstream("Laximo SOAP call failed: " + operation,
                                "Upstream SOAP endpoint is unreachable or returned a fault."));
    }

    /** Parses XML and returns the {@code soapenv:Body} element. */
    public org.w3c.dom.Node parseBody(String xml) {
        try {
            org.w3c.dom.Document doc = toDocument(xml);
            org.w3c.dom.Node body = firstElement(doc.getDocumentElement(), "Body");
            if (body == null) {
                throw new IllegalStateException("no soapenv:Body in response");
            }
            return body;
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Malformed Laximo response: {}", e.toString());
            throw ApiException.upstream("Laximo returned malformed XML",
                    "Check the WSDL version configured for the account.");
        }
    }

    private org.w3c.dom.Document toDocument(String xml) throws Exception {
        javax.xml.parsers.DocumentBuilderFactory factory = javax.xml.parsers.DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        try (java.io.InputStream in = new java.io.ByteArrayInputStream(xml.getBytes(java.nio.charset.StandardCharsets.UTF_8))) {
            return factory.newDocumentBuilder().parse(in);
        }
    }

    /** Depth-first search for a direct child with the given local name. */
    public static org.w3c.dom.Node firstElement(org.w3c.dom.Node parent, String localName) {
        if (parent == null) {
            return null;
        }
        org.w3c.dom.NodeList children = parent.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            org.w3c.dom.Node child = children.item(i);
            if (child.getNodeType() == org.w3c.dom.Node.ELEMENT_NODE && localName.equals(child.getLocalName())) {
                return child;
            }
        }
        return null;
    }

}
