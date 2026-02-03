#include "PowerMonitor.h"

PowerMonitor::PowerMonitor() {
    // Constructor kosong, inisialisasi di begin()
}

bool PowerMonitor::begin() {
    return _ina219.begin();
}

PowerData PowerMonitor::read() {
    PowerData data;
    
    data.shuntVoltage_mV = _ina219.getShuntVoltage_mV();
    data.busVoltage_V = _ina219.getBusVoltage_V();
    data.current_mA = _ina219.getCurrent_mA();
    data.power_mW = _ina219.getPower_mW();
    data.loadVoltage_V = data.busVoltage_V + (data.shuntVoltage_mV / 1000);
    
    return data;
}