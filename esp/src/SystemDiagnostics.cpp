#include "SystemDiagnostics.h"
#include "esp_system.h"
#include "espOTA.h"

extern TaskHandle_t telnetTaskHandle;
extern TaskHandle_t telemetryTaskHandle;
extern TaskHandle_t gpsTaskHandle;
extern TaskHandle_t monitorHandle;
extern TaskHandle_t otaTaskHandle;

SystemDiagnostics::SystemDiagnostics(PowerMonitor* pwr, GpsHandler* gps, CommHandler* cell) {
    _pwr = pwr;
    _gps = gps;
    _cell = cell;
}

void SystemDiagnostics::run(DiagnosticMode mode) {
    DEBUG_PRINTLN("\n=== SYSTEM DIAGNOSTICS ===");
    
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
    DEBUG_PRINTLN(">> MODE: LAB VALIDATION (Green Light Test)");
    DEBUG_PRINTLN(">> Meneruskan data RAW GPS & Cek Sensor berkala...\n");

    // 1. Cek Sensor Sekali di Awal
    if (_pwr->begin()) { // Asumsi begin() mengembalikan true jika koneksi OK
         DEBUG_PRINTLN("✅ INA219: CONNECTED");
    } else {
         DEBUG_PRINTLN("❌ INA219: NOT FOUND (Check Wiring)");
    }

    DEBUG_PRINTLN("\n--- STARTING GPS STREAM (Press Reset to Exit) ---");
    
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
            DEBUG_PRINT("\n[SENSOR] ");
            DEBUG_PRINT(pData.busVoltage_V); DEBUG_PRINT(" V | ");
            DEBUG_PRINT(pData.current_mA); DEBUG_PRINTLN(" mA");
        }
        
        // Wajib: Delay kecil untuk Watchdog (jaga-jaga)
        vTaskDelay(1 / portTICK_PERIOD_MS); 
    }
}

void SystemDiagnostics::runSimTest() {
    DEBUG_PRINTLN(">> MODE: SIM7600 AT COMMAND PASSTHROUGH");
    DEBUG_PRINTLN(">> Pastikan Serial Monitor tersetting 'Both NL & CR'");
    DEBUG_PRINTLN(">> Ketik perintah AT di kolom input di atas...\n");
    
    _cell->begin();
    
    // Looping tanpa batas menahan FreeRTOS agar fokus di sini
    while (1) {
        _cell->serialPassthrough(); // Panggil fungsi dari CommHandler
        
        // Wajib ada delay untuk me-reset Watchdog Timer (TWDT)
        vTaskDelay(10 / portTICK_PERIOD_MS); 
    }
}

void SystemDiagnostics::runPerformanceMonitor() {
    DEBUG_PRINTLN(">> PERFORMANCE & MEMORY MONITOR");
    DEBUG_PRINTLN(">> Hai, saya menggunakan FreeRTOS...\n");

    while (1) {
        DEBUG_PRINTLN("\n================[ SYSTEM PERFORMANCE ]================");

        unsigned long uSec = millis() / 1000;
        DEBUG_PRINTF("Uptime          : %d Hari %02d:%02d:%02d\n", 
                      uSec/86400, (uSec%86400)/3600, (uSec%3600)/60, uSec%60);
                      
        // rest reason
        esp_reset_reason_t reason = esp_reset_reason();
        DEBUG_PRINT("Reset Reason    : ");
        
        if (reason == ESP_RST_POWERON) {
            DEBUG_PRINTLN("due to power-on event");}
        else if (reason == ESP_RST_SW) {
            DEBUG_PRINTLN("Software reset via esp_restart");}
        else if (reason == ESP_RST_PANIC) {
            DEBUG_PRINTLN("Software reset due to exception/panic");}
        else if (reason == ESP_RST_INT_WDT) {
            DEBUG_PRINTLN("due to interrupt watchdog");}
        else if (reason == ESP_RST_TASK_WDT) {
            DEBUG_PRINTLN("due to task watchdog");}
        else if (reason == ESP_RST_WDT) {
            DEBUG_PRINTLN ("due to other watchdogs");}
        else if (reason == ESP_RST_DEEPSLEEP) {
            DEBUG_PRINTLN ("reset after exiting deep sleep mode");}
        else if (reason == ESP_RST_BROWNOUT) {
            DEBUG_PRINTLN ("Brownout reset (software or hardware)");}
        else if (reason == ESP_RST_SDIO) {
            DEBUG_PRINTLN ("Reset over SDIO");}
        else if (reason == ESP_RST_UNKNOWN) {
            DEBUG_PRINTLN("reason can not be determined");}
        else {DEBUG_PRINTLN("nguwawor");}
        // Memantau Memori RAM (Heap) Keseluruhan
        DEBUG_PRINTF("Free Heap       : %d bytes\n", ESP.getFreeHeap());
        DEBUG_PRINTF("Max Alloc Heap  : %d bytes (Blok memori terbesar yg bisa dialokasi)\n", ESP.getMaxAllocHeap());
        DEBUG_PRINTF("Min Free Heap   : %d bytes (Sisa RAM paling sedikit yg pernah terjadi)\n", ESP.getMinFreeHeap());
        
        
        
        DEBUG_PRINTLN("\n--- Task Stack Monitor ---");
        // Memantau Sisa Stack Task Saat Ini (Monitor_Task)
        // High Water Mark (HWM) menunjukkan SISA memori terendah yang pernah dicapai task ini.
        // Jika nilainya mendekati 0, artinya task hampir mengalami Stack Overflow!
        UBaseType_t hwm = uxTaskGetStackHighWaterMark(NULL);
        DEBUG_PRINTF("Monitor Task HWM: %u bytes (Sisa ruang aman)\n\n", hwm);

        if (otaTaskHandle != NULL) {
        UBaseType_t hwmOta = uxTaskGetStackHighWaterMark(otaTaskHandle);
        DEBUG_PRINTF("OTA HWM   : %u bytes\n", hwmOta);
        }

        if (telnetTaskHandle != NULL) {
        UBaseType_t hwmTelnet = uxTaskGetStackHighWaterMark(telnetTaskHandle);
        DEBUG_PRINTF("Telnet HWM   : %u bytes\n", hwmTelnet);
        }

        if (telemetryTaskHandle != NULL) {
        UBaseType_t hwmTele = uxTaskGetStackHighWaterMark(telemetryTaskHandle);
        DEBUG_PRINTF("Telemetry HWM   : %u bytes\n", hwmTele);
        }

        if (gpsTaskHandle != NULL) {
        UBaseType_t hwmGps = uxTaskGetStackHighWaterMark(gpsTaskHandle);
        DEBUG_PRINTF("GPS HWM   : %u bytes\n", hwmGps);
        }

        if (monitorHandle != NULL) {
        UBaseType_t hwmMonitor = uxTaskGetStackHighWaterMark(monitorHandle);
        DEBUG_PRINTF("Power HWM   : %u bytes\n", hwmMonitor);
        }

        DEBUG_PRINTLN("======================================================");

        // Delay 5 detik
        vTaskDelay(5000 / portTICK_PERIOD_MS);
    }
}