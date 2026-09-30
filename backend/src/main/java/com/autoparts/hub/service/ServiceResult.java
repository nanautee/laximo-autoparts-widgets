package com.autoparts.hub.service;

import com.autoparts.hub.dto.ResponseMeta;

/**
 * Service-level result: the payload plus the metadata the widgets render
 * (source of the data, cache state, timing).
 */
public record ServiceResult<T>(T data, ResponseMeta meta) {

    public static <T> ServiceResult<T> of(T data, ResponseMeta meta) {
        return new ServiceResult<>(data, meta);
    }
}
