#include "api_client.h"
#include "config.h"
#include <HTTPClient.h>
#include <ArduinoJson.h>

ValidationResponse validateCard(const String& uid) {
    ValidationResponse result;
    result.success = false;
    result.authorized = false;
    result.action = "RED_LED";
    result.message = "Error";
    result.userName = "";
    result.httpCode = 0;

    HTTPClient http;

    String url = String(BACKEND_URL) + "/api/cards/validate";

    Serial.print("[API] Validating UID: ");
    Serial.print(uid);
    Serial.print(" → ");
    Serial.println(url);

    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-api-key", DEVICE_API_KEY);
    http.setTimeout(API_TIMEOUT);

    // Build JSON request body
    JsonDocument doc;
    doc["uid"] = uid;
    doc["deviceId"] = DEVICE_ID;
    doc["timestamp"] = millis() / 1000;  // uptime seconds (real timestamp set by backend)

    String requestBody;
    serializeJson(doc, requestBody);

    // Send POST request
    int httpCode = http.POST(requestBody);
    result.httpCode = httpCode;

    if (httpCode == 200) {
        String response = http.getString();
        Serial.print("[API] Response: ");
        Serial.println(response);

        // Parse JSON response
        JsonDocument resDoc;
        DeserializationError error = deserializeJson(resDoc, response);

        if (!error) {
            result.success = true;
            result.authorized = resDoc["authorized"] | false;
            result.action = resDoc["action"] | "RED_LED";
            result.message = resDoc["message"] | "Unknown";
            result.userName = resDoc["userName"] | "";
        } else {
            Serial.print("[API] JSON parse error: ");
            Serial.println(error.c_str());
        }
    } else if (httpCode > 0) {
        Serial.print("[API] HTTP error code: ");
        Serial.println(httpCode);
        result.message = "HTTP " + String(httpCode);
    } else {
        Serial.print("[API] Connection failed: ");
        Serial.println(http.errorToString(httpCode));
        result.message = "Connection failed";
    }

    http.end();
    return result;
}
