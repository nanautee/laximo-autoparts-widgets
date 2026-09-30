package com.autoparts.hub.error;

/** Domain error carrying an HTTP status and a widget-friendly message. */
public class ApiException extends RuntimeException {

    private final int status;
    private final String code;
    private final String hint;

    public ApiException(int status, String code, String message, String hint) {
        super(message);
        this.status = status;
        this.code = code;
        this.hint = hint;
    }

    public static ApiException badRequest(String code, String message, String hint) {
        return new ApiException(400, code, message, hint);
    }

    public static ApiException notFound(String message, String hint) {
        return new ApiException(404, "NOT_FOUND", message, hint);
    }

    public static ApiException upstream(String message, String hint) {
        return new ApiException(502, "UPSTREAM_ERROR", message, hint);
    }

    public static ApiException notConfigured(String message, String hint) {
        return new ApiException(503, "NOT_CONFIGURED", message, hint);
    }

    public int getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }

    public String getHint() {
        return hint;
    }
}
