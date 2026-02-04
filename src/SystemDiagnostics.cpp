#include "SystemDiagnostics.h"

SystemDiagnostics::SystemDiagnostics(PowerMonitor* pwr, GpsHandler* gps, CommHandler* cell) {
    _pwr = pwr;
    _gps = gps;
    _cell = cell;
}

void SystemDiagnostics::run(DiagnosticMode mode) {
    Serial.println("\n=== SYSTEM DIAGNOSTICS ===");
    
    if (mode == TEST_LAB_PASSTHROUGH) {
        runLabTest();
    }
    // ... mode lain bisa ditambahkan nanti ...
}

void SystemDiagnostics::runLabTest() {
    Serial.println(">> MODE: LAB VALIDATION (Green Light Test)");
    Serial.println(">> Meneruskan data RAW GPS & Cek Sensor berkala...\n");

    // 1. Cek Sensor Sekali di Awal
    if (_pwr->begin()) { // Asumsi begin() mengembalikan true jika koneksi OK
         Serial.println("✅ INA219: CONNECTED");
    } else {
         Serial.println("❌ INA219: NOT FOUND (Check Wiring)");
    }

    Serial.println("\n--- STARTING GPS STREAM (Press Reset to Exit) ---");
    
    // Loop Selamanya (Meniru void loop di kode tes sederhana)
    unsigned long lastSensorCheck = 0;
    
    while (1) {
        // TUGAS 1: GPS Passthrough (Inti dari Green Light)
        _gps->echoRawData(); 

        // TUGAS 2: Cek Sensor tiap 2 detik (Opsional, agar tidak bosan)
        if (millis() - lastSensorCheck > 2000) {
            lastSensorCheck = millis();
            PowerData pData = _pwr->read();
            
            // Tampilkan info singkat tanpa mengganggu stream GPS terlalu banyak
            Serial.print("\n[SENSOR] ");
            Serial.print(pData.busVoltage_V); Serial.print(" V | ");
            Serial.print(pData.current_mA); Serial.println(" mA");
        }
        
        // Wajib: Delay kecil untuk Watchdog (jaga-jaga)
        vTaskDelay(1 / portTICK_PERIOD_MS); 
    }
}