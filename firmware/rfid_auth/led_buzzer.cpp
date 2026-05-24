#include "led_buzzer.h"
#include "config.h"

void initIndicators() {
    pinMode(GREEN_LED_PIN, OUTPUT);
    pinMode(RED_LED_PIN, OUTPUT);
    pinMode(BUZZER_PIN, OUTPUT);

    // Ensure all off at boot
    clearIndicators();

    // Quick startup flash to confirm indicators work
    digitalWrite(GREEN_LED_PIN, HIGH);
    digitalWrite(RED_LED_PIN, HIGH);
    delay(200);
    clearIndicators();

    Serial.println("[LED] Indicators initialized");
}

void showGranted() {
    Serial.println("[LED] ✓ ACCESS GRANTED");
    clearIndicators();

    digitalWrite(GREEN_LED_PIN, HIGH);

    // Short beep
    digitalWrite(BUZZER_PIN, HIGH);
    delay(BEEP_SHORT);
    digitalWrite(BUZZER_PIN, LOW);

    // Hold green LED
    delay(LED_DURATION - BEEP_SHORT);
    clearIndicators();
}

void showDenied() {
    Serial.println("[LED] ✗ ACCESS DENIED");
    clearIndicators();

    digitalWrite(RED_LED_PIN, HIGH);

    // Long beep
    digitalWrite(BUZZER_PIN, HIGH);
    delay(BEEP_LONG);
    digitalWrite(BUZZER_PIN, LOW);

    // Hold red LED
    delay(LED_DURATION - BEEP_LONG);
    clearIndicators();
}

void showError() {
    Serial.println("[LED] ⚠ ERROR");
    clearIndicators();

    // Blink both LEDs 3 times rapidly
    for (int i = 0; i < 3; i++) {
        digitalWrite(GREEN_LED_PIN, HIGH);
        digitalWrite(RED_LED_PIN, HIGH);
        digitalWrite(BUZZER_PIN, HIGH);
        delay(100);
        clearIndicators();
        delay(100);
    }
}

void clearIndicators() {
    digitalWrite(GREEN_LED_PIN, LOW);
    digitalWrite(RED_LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, LOW);
}
