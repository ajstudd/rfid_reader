/**
 * RFID/NFC Smart Authentication System — ESP32 Firmware
 * 
 * Main sketch that orchestrates:
 *   1. WiFi connectivity
 *   2. RFID card reading (MFRC522 via SPI)
 *   3. Backend API validation
 *   4. LED + Buzzer feedback
 * 
 * Hardware:
 *   - ESP32-WROOM-32 Dev Board
 *   - MFRC522 RFID Module (SPI)
 *   - Green LED (GPIO 2) + Red LED (GPIO 4)
 *   - Active Buzzer (GPIO 15)
 * 
 * Required Libraries:
 *   - WiFi.h          (built-in ESP32)
 *   - HTTPClient.h    (built-in ESP32)
 *   - SPI.h           (built-in)
 *   - MFRC522         (miguelbalboa/rfid)
 *   - ArduinoJson     (v7.x, install via Library Manager)
 */

#include "config.h"
#include "wifi_manager.h"
#include "rfid_reader.h"
#include "api_client.h"
#include "led_buzzer.h"

// Track last card read time to prevent rapid duplicate reads
unsigned long lastCardReadTime = 0;

void setup() {
    Serial.begin(115200);
    delay(1000);  // Allow serial monitor to connect

    Serial.println("========================================");
    Serial.println("  RFID/NFC Smart Auth System v1.0");
    Serial.println("  Device: " DEVICE_ID);
    Serial.println("========================================");
    Serial.println();

    // Initialize hardware
    initIndicators();
    initRFID();

    // Connect to WiFi
    Serial.println("[BOOT] Connecting to WiFi...");
    if (connectWiFi()) {
        Serial.println("[BOOT] System ready. Waiting for card taps...");
    } else {
        Serial.println("[BOOT] WiFi failed! Will retry in loop...");
        showError();
    }

    Serial.println();
}

void loop() {
    // Ensure WiFi is connected (auto-reconnects if dropped)
    if (!ensureWiFiConnected()) {
        // No WiFi — show error and skip card processing
        delay(1000);
        return;
    }

    // Read RFID card
    String uid = readCardUID();

    if (uid.length() == 0) {
        // No card present — continue polling
        return;
    }

    // Cooldown check — prevent reading same card too fast
    unsigned long now = millis();
    if (now - lastCardReadTime < CARD_READ_COOLDOWN) {
        return;
    }
    lastCardReadTime = now;

    // Card detected!
    Serial.println();
    Serial.print("[CARD] UID detected: ");
    Serial.println(uid);

    // Validate with backend
    ValidationResponse response = validateCard(uid);

    if (!response.success) {
        // API request failed (network error, server down, etc.)
        Serial.println("[CARD] Backend unreachable — showing error");
        showError();
        return;
    }

    // Act on response
    if (response.authorized) {
        Serial.print("[CARD] Welcome, ");
        Serial.println(response.userName);
        showGranted();
    } else {
        Serial.print("[CARD] Denied: ");
        Serial.println(response.message);
        showDenied();
    }

    Serial.println();
}
