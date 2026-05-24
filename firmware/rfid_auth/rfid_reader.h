#ifndef RFID_READER_H
#define RFID_READER_H

#include <SPI.h>
#include <MFRC522.h>

/**
 * Initialize the MFRC522 RFID reader.
 * Call once in setup().
 */
void initRFID();

/**
 * Check if a new card is present and read its UID.
 * Returns the UID as a hex string (e.g., "A7BB9731") or empty string if no card.
 * Automatically halts the card after reading.
 */
String readCardUID();

#endif // RFID_READER_H
