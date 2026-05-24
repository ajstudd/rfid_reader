#ifndef CONFIG_H
#define CONFIG_H

// =============================================
//  WiFi Configuration
// =============================================
#define WIFI_SSID       "AJX_5G"
#define WIFI_PASSWORD   "appointy-sde"

// =============================================
//  Backend API Configuration
// =============================================
// Use local IP if on same LAN, or ngrok/public URL if cross-network
#define BACKEND_URL     "http://10.101.163.134:3001"
#define DEVICE_ID       "gate-01"
#define DEVICE_API_KEY  "esp32-secret-key"

// =============================================
//  RFID RC522 Pin Configuration (SPI)
// =============================================
#define RC522_SS_PIN    5
#define RC522_RST_PIN   22
// SCK  = GPIO 18 (default SPI)
// MOSI = GPIO 23 (default SPI)
// MISO = GPIO 19 (default SPI)

// =============================================
//  LED & Buzzer Pin Configuration
// =============================================
#define GREEN_LED_PIN   2
#define RED_LED_PIN     4
#define BUZZER_PIN      15

// =============================================
//  Timing Configuration (milliseconds)
// =============================================
#define WIFI_CONNECT_TIMEOUT  15000
#define WIFI_RETRY_DELAY      5000
#define API_TIMEOUT           5000
#define LED_DURATION          2000
#define BEEP_SHORT            100
#define BEEP_LONG             500
#define CARD_READ_COOLDOWN    1500

#endif // CONFIG_H
