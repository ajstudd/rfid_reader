#ifndef API_CLIENT_H
#define API_CLIENT_H

#include <Arduino.h>

/**
 * Response structure from backend validation.
 */
struct ValidationResponse {
    bool success;         // HTTP request succeeded
    bool authorized;      // Card is authorized
    String action;        // "GREEN_LED", "RED_LED", etc.
    String message;       // "Access Granted", "Access Denied", etc.
    String userName;      // User name if authorized
    int httpCode;         // HTTP response code
};

/**
 * Send card UID to backend for validation.
 * Posts to BACKEND_URL/api/cards/validate with device API key.
 * 
 * @param uid The card UID hex string (e.g., "A7BB9731")
 * @return ValidationResponse with the result
 */
ValidationResponse validateCard(const String& uid);

#endif // API_CLIENT_H
