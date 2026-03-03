// Modul untuk PlatformIO
#include <Arduino.h>

// Modul untuk OTA
#include <espOTA.h>

/* @brief
 * semua data sensitif meliputi SSID, PASS, OTA PASS, SERVER URL
 * didefinisikan di file 'secrets.h'
 * agar mudah diatur tanpa mengubah kode utama
 * dan menghindari upload data sensitif ke repo publik 
 * brief ini di-generate sama CoPilot VS Code btw
 * makanya bahasa nya semi baku
 */

#include <secrets.h>

// Modul untuk sistem
#include "GpsHandler.h"
#include "PowerMonitor.h"
#include "CommHandler.h"
#include "SystemDiagnostics.h"

/* @brief
 * pinout juga sama 
 * disimpen di pinout.h
 * biar kalo ngulik-ngulik gausah buka main.cpp (bosen)
 */

#include "pinout.h"

// cek notip (komentar untuk disable) [shortcut di VS Code: Ctrl + /]
// #define RUN_TEST // <- Buat run task biasa
#define RUN_DIAGNOSTICS // <-- Buat DIAGNOSIS SISTEM

// Instansiasi Objek Modul Baru
ESP_OTA remoteUpdate;
CommHandler comm(SIM_RX_PIN, SIM_TX_PIN, COMM_BAUDRATE, SIM_SERIAL_PORT);
GpsHandler gpsHandler(GPS_RX_PIN, GPS_TX_PIN, GPS_SERIAL_PORT);
PowerMonitor powerMonitor;
SystemDiagnostics diagnostics(&powerMonitor, &gpsHandler, &comm);

// --- SHARED DATA & MUTEX ---
// Struktur data bersama antar task
struct SharedData {
    double lat;
    double lng;
    float power_mW;
    float voltage_V;
    float current_mA;
    bool gpsUpdated;
};

SharedData latestData;
SemaphoreHandle_t dataMutex;

// --- TASKS ---

// Task 1: Telemetry via 4G (MQTT HiveMQ)
void TaskTelemetry(void *pvParameters) {
    static bool lteConnected = false;
    static bool mqttConnected = false; 

    while (1) {
        // 1. Cek Koneksi Jaringan 4G
        if (!lteConnected) {
            Serial.println("\n📡 [TELEMETRY] Modem belum siap. Mencoba inisialisasi...");
            if (comm.begin()) {
                lteConnected = true;
            } else {
                Serial.println("❌ [TELEMETRY] Gagal Connect 4G. Coba lagi 10 detik...");
                vTaskDelay(10000 / portTICK_PERIOD_MS); 
                continue; 
            }
        }

        // 2. Cek Koneksi ke Broker MQTT
        if (lteConnected && !mqttConnected) {
            Serial.println("📡 [TELEMETRY] Menghubungkan ke Broker HiveMQ...");
            // Menggunakan konstanta dari secrets.h
            if (comm.connectMQTT(MQTT_BROKER, MQTT_PORT, MQTT_CLIENT_ID, MQTT_USER, MQTT_PASS)) {
                Serial.println("✅ [TELEMETRY] Terhubung ke Broker! Siap publish data.");
                mqttConnected = true;
            } else {
                Serial.println("❌ [TELEMETRY] Gagal Login MQTT. Coba lagi 10 detik...");
                vTaskDelay(10000 / portTICK_PERIOD_MS); 
                continue; 
            }
        }

        // 3. Rakit JSON & Publish (Hanya jalan jika MQTT Connected)
        String jsonPayload = "";
        bool readyToSend = false;

        if (xSemaphoreTake(dataMutex, (TickType_t) 100) == pdTRUE) {
            jsonPayload = "{";
            jsonPayload += "\"lat\":" + String(latestData.lat, 6) + ",";
            jsonPayload += "\"lng\":" + String(latestData.lng, 6) + ",";
            jsonPayload += "\"voltage\":" + String(latestData.voltage_V, 2) + ",";
            jsonPayload += "\"power\":" + String(latestData.power_mW, 2);
            jsonPayload += "}";
            
            readyToSend = true;
            xSemaphoreGive(dataMutex);
        }

        if (readyToSend && mqttConnected) {
            Serial.println("📡 Mempublikasikan Data via MQTT...");
            
            // Masukkan Topik MQTT yang diinginkan di sini
            if (comm.publishMQTT("alsintan/traktor1/telemetri", jsonPayload)) {
                Serial.println("✅ Data Published Successfully!");
            } else {
                Serial.println("❌ Publish Failed (Koneksi Terputus)");
                // Reset flag agar modul mencoba re-connect pada loop berikutnya
                mqttConnected = false; 
            }
        }

        vTaskDelay(10000 / portTICK_PERIOD_MS);
    }
}

// Task 2: GPS Reading
void TaskGPS(void *pvParameters) {
    while (1) {
        // Panggil method update() dari modul GpsHandler
        if (gpsHandler.update()) {
            
            // Ambil Mutex
            if (xSemaphoreTake(dataMutex, (TickType_t) 10) == pdTRUE) {
                // Update data jika lokasi valid
                if (gpsHandler.isValid()) {
                    latestData.lat = gpsHandler.getLat();
                    latestData.lng = gpsHandler.getLng();
                    latestData.gpsUpdated = true;
                }
                xSemaphoreGive(dataMutex);
            }
        }
        vTaskDelay(10 / portTICK_PERIOD_MS); 
    }
}

// Task 3: Sensor Monitor
void TaskMonitor(void *pvParameters) {
    while (1) {
        // Baca data sensor melalui modul PowerMonitor
        PowerData pData = powerMonitor.read();

        // --- UPDATE SHARED DATA ---
        double currentLat = 0.0;
        double currentLng = 0.0;
        bool validGPS = false;

        if (xSemaphoreTake(dataMutex, (TickType_t) 10) == pdTRUE) {
            currentLat = latestData.lat;
            currentLng = latestData.lng;
            validGPS = latestData.gpsUpdated;
            
            latestData.power_mW = pData.power_mW;
            latestData.voltage_V = pData.loadVoltage_V;
            latestData.current_mA = pData.current_mA;
            
            xSemaphoreGive(dataMutex);
        }

        // --- PRINT DETAILED REPORT ---
        Serial.println("\n--- [TASK] Power & Location Report ---");

        Serial.print("Bus Voltage : "); Serial.print(pData.busVoltage_V); Serial.println(" V");
        Serial.print("Shunt Volt  : "); Serial.print(pData.shuntVoltage_mV); Serial.println(" mV");
        Serial.print("Load Voltage: "); Serial.print(pData.loadVoltage_V); Serial.println(" V");
        Serial.print("Current     : "); Serial.print(pData.current_mA); Serial.println(" mA");
        Serial.print("Power       : "); Serial.print(pData.power_mW); Serial.println(" mW");

        if (validGPS) {
            Serial.printf("GPS         : %.6f, %.6f\n", currentLat, currentLng);
        } else {
            Serial.println("GPS         : Waiting for lock...");
        }
        Serial.println("---------------------------------------------------");

        vTaskDelay(2000 / portTICK_PERIOD_MS);
    }
}

void setup() {
    Serial.begin(115200);
    
    // Setup OTA
    remoteUpdate.begin(WIFI_SSID, WIFI_PASS, OTA_PASS);

    Serial.println("\n\n=== FIRMWARE V2 (MODULAR) ===");

    // Setup Comm Module
    Serial.println("Initializing SIM7600 (4G)...");
    // Coba sekali di awal (opsional, karena TaskTelemetry juga bakal coba)
    // Tapi bagus untuk UX agar user tahu status awal
    if (!comm.begin()) {
        Serial.println("⚠️ Init Awal Gagal (Akan dicoba ulang di Telemetry Task)");
        // Jangan stop program, biarkan lanjut ke scheduler
    } else {
        Serial.println("✅ SIM7600 Ready");
    }
    
    // Init GPS Module
    gpsHandler.begin(9600);

    // Init Power Module
    if (!powerMonitor.begin()) {
        Serial.println("❌ INA219 Not Found!");
    } else {
        Serial.println("✅ INA219 Connected");
    }

    // Create Mutex
    dataMutex = xSemaphoreCreateMutex();

    #ifdef RUN_TEST
    xTaskCreate(TaskTelemetry, "Telemetry_Task", 8192, NULL, 1, NULL);
    xTaskCreate(TaskGPS, "GPS_Task", 4096, NULL, 1, NULL);
    xTaskCreate(TaskMonitor, "Monitor_Task", 4096, NULL, 1, NULL);

    // Serial.println("✅ FreeRTOS Scheduler Started...");
    #endif

    #ifdef RUN_DIAGNOSTICS
    // diagnostics.run(TEST_LAB_PASSTHROUGH);
    diagnostics.run(TEST_SIM_PASSTHROUGH);
    #endif
}

void loop() {
    vTaskDelete(NULL);
}