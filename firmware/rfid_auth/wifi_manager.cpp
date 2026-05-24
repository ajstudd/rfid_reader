#include "wifi_manager.h"
#include "config.h"

static unsigned long lastReconnectAttempt = 0;

bool connectWiFi() {
    Serial.print("[WiFi] Connecting to ");
    Serial.println(WIFI_SSID);

    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    unsigned long startTime = millis();

    while (WiFi.status() != WL_CONNECTED) {
        if (millis() - startTime > WIFI_CONNECT_TIMEOUT) {
            Serial.println("\n[WiFi] Connection TIMEOUT");
            return false;
        }
        delay(500);
        Serial.print(".");
    }

    Serial.println();
    Serial.print("[WiFi] Connected! IP: ");
    Serial.println(WiFi.localIP());
    return true;
}

bool ensureWiFiConnected() {
    if (WiFi.status() == WL_CONNECTED) {
        return true;
    }

    // Avoid hammering reconnect — throttle attempts
    unsigned long now = millis();
    if (now - lastReconnectAttempt < WIFI_RETRY_DELAY) {
        return false;
    }
    lastReconnectAttempt = now;

    Serial.println("[WiFi] Disconnected. Reconnecting...");
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    // Wait briefly for reconnect (non-blocking style for loop)
    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 3000) {
        delay(100);
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.print("[WiFi] Reconnected! IP: ");
        Serial.println(WiFi.localIP());
        return true;
    }

    Serial.println("[WiFi] Reconnect failed. Will retry...");
    return false;
}

String getLocalIP() {
    return WiFi.localIP().toString();
}
