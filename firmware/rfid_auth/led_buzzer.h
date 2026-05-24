#ifndef LED_BUZZER_H
#define LED_BUZZER_H

#include <Arduino.h>

/**
 * Initialize LED and buzzer pins.
 * Call once in setup().
 */
void initIndicators();

/**
 * Show access granted feedback:
 * Green LED on + short beep, hold for LED_DURATION, then off.
 */
void showGranted();

/**
 * Show access denied feedback:
 * Red LED on + long beep, hold for LED_DURATION, then off.
 */
void showDenied();

/**
 * Show error feedback (WiFi/API failure):
 * Both LEDs blink rapidly 3 times.
 */
void showError();

/**
 * Turn off all indicators immediately.
 */
void clearIndicators();

#endif // LED_BUZZER_H
