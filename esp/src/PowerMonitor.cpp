#include "PowerMonitor.h"
#include <math.h>

PowerMonitor::PowerMonitor() {
    _isConnected = false;
}

bool PowerMonitor::begin() {
    _isConnected =  _ina219.begin();
    return _isConnected;
}

PowerData PowerMonitor::read() {
    PowerData data;

    Wire.beginTransmission(0x40);
    if (Wire.endTransmission() != 0 ) {
        // kalo gagal
        _isConnected = false;
        data.shuntVoltage_mV = NAN;
        data.busVoltage_V = NAN;
        data.current_mA = NAN;
        data.power_mW = NAN;
        data.loadVoltage_V = NAN;

        return data;
    }

    if (!_isConnected) {
        _ina219.begin();
        _isConnected = true;
        Serial.println("🔌 [POWER] INA219 Reconnected & Re-initialized!");
    }
    
    data.shuntVoltage_mV = _ina219.getShuntVoltage_mV();
    data.busVoltage_V = _ina219.getBusVoltage_V();
    data.current_mA = _ina219.getCurrent_mA();
    data.power_mW = _ina219.getPower_mW();
    data.loadVoltage_V = data.busVoltage_V + (data.shuntVoltage_mV / 1000);
    
    return data;
}