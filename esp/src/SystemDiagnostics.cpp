#include "SystemDiagnostics.h"
#include "esp_system.h"

extern TaskHandle_t telemetryTaskHandle;
extern TaskHandle_t gpsTaskHandle;
extern TaskHandle_t monitorHandle;

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
    else if (mode == TEST_SIM_PASSTHROUGH) {
        runSimTest();
    }
    else if (mode == TEST_PERFORMANCE_MONITOR) {
        runPerformanceMonitor();
    // ... mode lain bisa ditambahkan nanti ...
    }
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

void SystemDiagnostics::runSimTest() {
    Serial.println(">> MODE: SIM7600 AT COMMAND PASSTHROUGH");
    Serial.println(">> Pastikan Serial Monitor tersetting 'Both NL & CR'");
    Serial.println(">> Ketik perintah AT di kolom input di atas...\n");
    
    _cell->begin();
    
    // Looping tanpa batas menahan FreeRTOS agar fokus di sini
    while (1) {
        _cell->serialPassthrough(); // Panggil fungsi dari CommHandler
        
        // Wajib ada delay untuk me-reset Watchdog Timer (TWDT)
        vTaskDelay(10 / portTICK_PERIOD_MS); 
    }
}

void SystemDiagnostics::runPerformanceMonitor() {
    Serial.println(">> PERFORMANCE & MEMORY MONITOR");
    Serial.println(">> Memantau RAM (Heap) dan sisa memori Task (High Water Mark)...\n");

    while (1) {
        Serial.println("\n================[ SYSTEM PERFORMANCE ]================");

        unsigned long uSec = millis() / 1000;
        Serial.printf("Uptime          : %d Hari %02d:%02d:%02d\n", 
                      uSec/86400, (uSec%86400)/3600, (uSec%3600)/60, uSec%60);
        
        // Memantau Memori RAM (Heap) Keseluruhan
        Serial.printf("Free Heap       : %d bytes\n", ESP.getFreeHeap());
        Serial.printf("Max Alloc Heap  : %d bytes (Blok memori terbesar yg bisa dialokasi)\n", ESP.getMaxAllocHeap());
        Serial.printf("Min Free Heap   : %d bytes (Sisa RAM paling sedikit yg pernah terjadi)\n", ESP.getMinFreeHeap());
        
        Serial.println("\n--- Task Stack Monitor ---");

        // rest reason
        Serial.print("Reset Reason    : ");
        esp_reset_reason_t reason = esp_reset_reason();
        if(reason == ESP_RST_POWERON) Serial.println("Power On");
        else if(reason == ESP_RST_BROWNOUT) Serial.println("Brownout (Tegangan Drop!)");
        else if(reason == ESP_RST_PANIC) Serial.println("Crash / Panic!");
        else Serial.println("Lainnya");

        // Memantau Sisa Stack Task Saat Ini (Monitor_Task)
        // High Water Mark (HWM) menunjukkan SISA memori terendah yang pernah dicapai task ini.
        // Jika nilainya mendekati 0, artinya task hampir mengalami Stack Overflow!
        UBaseType_t hwm = uxTaskGetStackHighWaterMark(NULL);
        Serial.printf("Monitor Task HWM: %u bytes (Sisa ruang aman)\n\n", hwm);

        if (telemetryTaskHandle != NULL) {
        UBaseType_t hwmTele = uxTaskGetStackHighWaterMark(telemetryTaskHandle);
        Serial.printf("Telemetry HWM   : %u bytes\n", hwmTele);
        }

        if (gpsTaskHandle != NULL) {
        UBaseType_t hwmGps = uxTaskGetStackHighWaterMark(gpsTaskHandle);
        Serial.printf("GPS HWM   : %u bytes\n", hwmGps);
        }

        if (monitorHandle != NULL) {
        UBaseType_t hwmMonitor = uxTaskGetStackHighWaterMark(monitorHandle);
        Serial.printf("Power HWM   : %u bytes\n", hwmMonitor);
        }

        Serial.println("======================================================");

        // Delay 2 detik
        vTaskDelay(2000 / portTICK_PERIOD_MS);
    }
}