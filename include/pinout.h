#pragma once

// Pin modul SIM7600G
#define SIM_RX_PIN 16
#define SIM_TX_PIN 17
#define COMM_BAUDRATE 115200
#define SIM_SERIAL_PORT 1

// Pin modul GPS NEO M8N (mereun)
#define GPS_RX_PIN 32
#define GPS_TX_PIN 33
#define GPS_BAUDRATE 9600
#define GPS_SERIAL_PORT 2

// Pin INA219

/* @brief
 * default:
 * SDA: 21 
 * SCL: 22
 */

// URL
#define SERVER_URL "mqtt://broker.hivemq.com"