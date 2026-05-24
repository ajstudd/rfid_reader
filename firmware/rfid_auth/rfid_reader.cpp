#include "rfid_reader.h"
#include "config.h"

static MFRC522 rfid(RC522_SS_PIN, RC522_RST_PIN);

void initRFID() {
    SPI.begin();
    rfid.PCD_Init();

    // Verify communication
    byte version = rfid.PCD_ReadRegister(rfid.VersionReg);
    Serial.print("[RFID] RC522 firmware version: 0x");
    Serial.println(version, HEX);

    if (version == 0x00 || version == 0xFF) {
        Serial.println("[RFID] WARNING: Communication failure! Check wiring.");
    } else {
        Serial.println("[RFID] Reader initialized OK");
    }
}

String readCardUID() {
    // Check for new card
    if (!rfid.PICC_IsNewCardPresent()) {
        return "";
    }

    // Read card serial
    if (!rfid.PICC_ReadCardSerial()) {
        return "";
    }

    // Build UID hex string (no spaces, uppercase)
    String uid = "";
    for (byte i = 0; i < rfid.uid.size; i++) {
        if (rfid.uid.uidByte[i] < 0x10) {
            uid += "0";  // leading zero for single-digit hex
        }
        uid += String(rfid.uid.uidByte[i], HEX);
    }
    uid.toUpperCase();

    // Halt card to allow re-reading
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();

    return uid;
}
