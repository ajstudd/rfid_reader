#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

#include <WiFi.h>

/**
 * Connect to WiFi using credentials from config.h.
 * Blocks until connected or timeout reached.
 * Returns true if connected, false on timeout.
 */
bool connectWiFi();

/**
 * Check WiFi status and auto-reconnect if disconnected.
 * Call this in loop() to maintain connection.
 * Returns true if currently connected.
 */
bool ensureWiFiConnected();

/**
 * Get the current local IP address as a String.
 */
String getLocalIP();

#endif // WIFI_MANAGER_H
