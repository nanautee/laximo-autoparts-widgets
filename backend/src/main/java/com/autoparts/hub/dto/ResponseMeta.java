package com.autoparts.hub.dto;

/**
 * Response metadata exposed with every payload so the frontend (and the client
 * during acceptance) can see whether data came from Redis or from Laximo.
 *
 * @param source  {@code laximo} | {@code mock} | {@code abcp}
 * @param cache   {@code HIT} | {@code MISS} | {@code BYPASS}
 * @param tookMs  server-side processing time
 * @param note    human readable hint, e.g. mock-mode warning
 */
public record ResponseMeta(String source, String cache, long tookMs, String note) {

    public static ResponseMeta of(String source, String cache, long tookMs, String note) {
        return new ResponseMeta(source, cache, tookMs, note);
    }
}
