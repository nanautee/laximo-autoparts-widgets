package com.autoparts.hub.dto;

import java.util.List;

/** Uniform error body so the widgets can render actionable messages. */
public record ApiError(
        String code,
        String message,
        String hint,
        List<FieldIssue> fields) {

    public record FieldIssue(String field, String message) {
    }
}
