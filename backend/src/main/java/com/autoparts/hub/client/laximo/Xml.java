package com.autoparts.hub.client.laximo;

import java.util.ArrayList;
import java.util.List;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

/**
 * Tolerant DOM helpers for reading Laximo responses.
 *
 * <p>Laximo WSDLs differ slightly between service versions and markets, so the
 * mapping code looks nodes up by local name and treats anything missing as
 * {@code null} instead of throwing.
 */
final class Xml {

    private Xml() {
    }

    static String attr(Node node, String name) {
        if (node == null) {
            return null;
        }
        var attrs = node.getAttributes();
        for (int i = 0; i < attrs.getLength(); i++) {
            var a = attrs.item(i);
            if (name.equals(a.getLocalName()) || name.equals(a.getNodeName())) {
                String v = a.getNodeValue();
                return v == null || v.isBlank() ? null : v.trim();
            }
        }
        return null;
    }

    static Node child(Node parent, String localName) {
        if (parent == null) {
            return null;
        }
        NodeList children = parent.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            Node c = children.item(i);
            if (c.getNodeType() == Node.ELEMENT_NODE && localName.equals(c.getLocalName())) {
                return c;
            }
        }
        return null;
    }

    static Node descendant(Node parent, String localName) {
        if (!(parent instanceof Element element)) {
            return null;
        }
        NodeList all = element.getElementsByTagNameNS("*", localName);
        if (all.getLength() > 0) {
            return all.item(0);
        }
        NodeList legacy = element.getElementsByTagName(localName);
        return legacy.getLength() > 0 ? legacy.item(0) : null;
    }

    static String text(Node parent, String... path) {
        Node current = parent;
        for (String step : path) {
            current = child(current, step);
            if (current == null) {
                return null;
            }
        }
        return text(current);
    }

    static String text(Node node) {
        if (node == null) {
            return null;
        }
        String value = node.getTextContent();
        return value == null || value.isBlank() ? null : value.trim();
    }

    static List<Node> children(Node parent, String localName) {
        List<Node> result = new ArrayList<>();
        if (parent == null) {
            return result;
        }
        NodeList children = parent.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            Node c = children.item(i);
            if (c.getNodeType() == Node.ELEMENT_NODE && localName.equals(c.getLocalName())) {
                result.add(c);
            }
        }
        return result;
    }

    static List<Node> descendants(Node parent, String localName) {
        List<Node> result = new ArrayList<>();
        if (!(parent instanceof Element element)) {
            return result;
        }
        NodeList all = element.getElementsByTagNameNS("*", localName);
        for (int i = 0; i < all.getLength(); i++) {
            result.add(all.item(i));
        }
        return result;
    }

    static Integer integer(Node parent, String... path) {
        String raw = text(parent, path);
        if (raw == null) {
            return null;
        }
        try {
            return Integer.valueOf(raw.replaceAll("[^0-9-]", ""));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** Escapes text before it is embedded into a SOAP request body. */
    static String escape(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
