#ifndef SYSTEM_DIAGNOSTICS_H
#define SYSTEM_DIAGNOSTICS_H

#include <Arduino.h>
#include "PowerMonitor.h"
#include "GpsHandler.h"
#include "CommHandler.h"

enum DiagnosticMode {
    TEST_CONNECTION_CHECK,    // Cek sekilas (True/False)
    TEST_DATA_MONITOR,        // Data matang (Latitude, Voltage)
    TEST_LAB_PASSTHROUGH      // <--- MODE BARU: Raw NMEA & Sensor Check
};

class SystemDiagnostics {
public:
    SystemDiagnostics(PowerMonitor* pwr, GpsHandler* gps, CommHandler* cell);
    void run(DiagnosticMode mode);

private:
    PowerMonitor* _pwr;
    GpsHandler* _gps;
    CommHandler* _cell;

    void runLabTest(); // Fungsi khusus meniru tes manual Anda
};

#endif