#ifndef POWER_MONITOR_H
#define POWER_MONITOR_H

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_INA219.h>

// Struct untuk mengelompokkan data power
struct PowerData {
    float shuntVoltage_mV;
    float busVoltage_V;
    float current_mA;
    float power_mW;
    float loadVoltage_V;
};

class PowerMonitor {
public:
    PowerMonitor();
    bool begin();
    PowerData read(); // Mengembalikan semua data sekaligus

private:
    Adafruit_INA219 _ina219;
};

#endif