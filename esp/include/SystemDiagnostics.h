#pragma once

#include <Arduino.h>
#include "PowerMonitor.h"
#include "GpsHandler.h"
#include "CommHandler.h"
#include "espOTA.h"

enum DiagnosticMode {
    TEST_CONNECTION_CHECK,      // Cek sekilas (True/False)
    TEST_DATA_MONITOR,          // Data matang (Latitude, Voltage)
    TEST_NMEA_PASSTHROUGH,      // Raw NMEA & Sensor Check
    TEST_SIM_PASSTHROUGH,       // Cek Modul 4G
    TEST_PERFORMANCE_MONITOR,   // Heap Monitor RTOS
    TEST_STORAGE_MONITOR,       // Cek file buffer
    TEST_SIMULATION
};

class SystemDiagnostics {
public:
    SystemDiagnostics(PowerMonitor* pwr, GpsHandler* gps, CommHandler* cell);
    void run(DiagnosticMode mode);

private:
    PowerMonitor* _pwr;
    GpsHandler* _gps;
    CommHandler* _cell;

    void runLabTest();
    void runSimTest();
    void runPerformanceMonitor();
    void runStorageMonitor();
    void runSimulation();
};