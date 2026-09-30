package com.autoparts.hub.cache;

/** Result of a cache lookup, surfaced to clients via the {@code X-Cache} header. */
public enum CacheStatus {
    HIT,
    MISS,
    BYPASS
}
