#ifndef SYSTEM_DIAGNOSTICS_H
#define SYSTEM_DIAGNOSTICS_H

#include <Arduino.h>
#include "PowerMonitor.h"
#include "GpsHandler.h"
#include "CommHandler.h"

enum DiagnosticMode {
    TEST_CONNECTION_CHECK,    // Cek sekilas (True/False)
    TEST_DATA_MONITOR,        // Data matang (Latitude, Voltage)
    TEST_LAB_PASSTHROUGH,     // Raw NMEA & Sensor Check
    TEST_SIM_PASSTHROUGH      // Cek Modul 4G
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
};

#endif