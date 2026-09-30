package com.autoparts.hub.error;

import com.autoparts.hub.dto.ApiError;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.support.WebExchangeBindException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public Mono<ResponseEntity<ApiError>> handleApi(ApiException ex) {
        return Mono.just(ResponseEntity.status(ex.getStatus())
                .body(new ApiError(ex.getCode(), ex.getMessage(), ex.getHint(), null)));
    }

    @ExceptionHandler(WebExchangeBindException.class)
    public Mono<ResponseEntity<ApiError>> handleValidation(WebExchangeBindException ex) {
        List<ApiError.FieldIssue> issues = ex.getFieldErrors().stream()
                .map(this::toIssue)
                .toList();
        ApiError body = new ApiError("VALIDATION_FAILED", "Request validation failed",
                "Check the highlighted fields and try again.", issues);
        return Mono.just(ResponseEntity.badRequest().body(body));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public Mono<ResponseEntity<ApiError>> handleIllegal(IllegalArgumentException ex) {
        return Mono.just(ResponseEntity.badRequest()
                .body(new ApiError("BAD_REQUEST", ex.getMessage(), null, null)));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public Mono<ResponseEntity<ApiError>> handleStatus(ResponseStatusException ex,
                                                        ServerWebExchange exchange) {
        HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
        return Mono.just(ResponseEntity.status(ex.getStatusCode())
                .body(new ApiError("HTTP_" + ex.getStatusCode().value(),
                        ex.getReason() != null ? ex.getReason() : status != null ? status.getReasonPhrase() : "error",
                        exchange.getRequest().getPath().value(), null)));
    }

    @ExceptionHandler(Exception.class)
    public Mono<ResponseEntity<ApiError>> handleAny(Exception ex) {
        log.error("Unhandled error", ex);
        return Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ApiError("INTERNAL_ERROR", "Unexpected server error",
                        "The upstream integration failed. Please retry.", null)));
    }

    private ApiError.FieldIssue toIssue(FieldError error) {
        return new ApiError.FieldIssue(error.getField(), error.getDefaultMessage());
    }
}
