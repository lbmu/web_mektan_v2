// Modul untuk PlatformIO
#include <Arduino.h>

// Modul untuk OTA
#include <espOTA.h>
#include <secrets.h>

// Modul untuk sistem
#include "GpsHandler.h"
#include "PowerMonitor.h"
#include "CommHandler.h"
#include "SystemDiagnostics.h"

// Pin modul SIM7600G
#define SIM_RX_PIN 16
#define SIM_TX_PIN 17
#define COMM_BAUDRATE 115200
#define SIM_SERIAL_PORT 1

// Pin modul GPS NEO M8N (mereun)
#define GPS_RX_PIN 32
#define GPS_TX_PIN 33
#define GPS_SERIAL_PORT 2

#define SERVER_URL "belum kocak"

// cek notip (komentar untuk disable)
// #define RUN_DIAGNOSTICS // <-- Buat cek kabel/
#define RUN_TEST // <- Buat run task biasa

// Instansiasi Objek Modul Baru
ESP_OTA remoteUpdate;
CommHandler comm(SIM_RX_PIN, SIM_TX_PIN, COMM_BAUDRATE, SIM_SERIAL_PORT);
GpsHandler gpsHandler(GPS_RX_PIN, GPS_TX_PIN, GPS_SERIAL_PORT);
PowerMonitor powerMonitor;
SystemDiagnostics diagnostics(&powerMonitor, &gpsHandler, &comm);

// --- SHARED DATA & MUTEX ---
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

// Task 1: Telemetry via 4G
void TaskTelemetry(void *pvParameters) {
    while (1) {
        String jsonPayload = "";
        bool readyToSend = false;

        // Ambil data dari Shared Memory (Mutex)
        if (xSemaphoreTake(dataMutex, (TickType_t) 100) == pdTRUE) {
            // Buat JSON String manual atau pakai ArduinoJson
            jsonPayload = "{";
            jsonPayload += "\"lat\":" + String(latestData.lat, 6) + ",";
            jsonPayload += "\"lng\":" + String(latestData.lng, 6) + ",";
            jsonPayload += "\"voltage\":" + String(latestData.voltage_V, 2) + ",";
            jsonPayload += "\"power\":" + String(latestData.power_mW, 2);
            jsonPayload += "}";
            
            readyToSend = true;
            xSemaphoreGive(dataMutex);
        }

        if (readyToSend) {
            Serial.println("📡 Sending Data via 4G...");
            if (comm.sendData(SERVER_URL, jsonPayload)) {
                Serial.println("✅ Data Sent Successfully!");
            } else {
                Serial.println("❌ Send Failed");
            }
        }

        // Kirim setiap 10 detik (Jangan terlalu cepat agar hemat kuota/baterai)
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

void TaskBlink(void *pvParameters) {
    pinMode(2, OUTPUT);
    for (;;) {
        digitalWrite(2, HIGH);
        vTaskDelay(pdMS_TO_TICKS(500));
        digitalWrite(2, LOW);
        vTaskDelay(pdMS_TO_TICKS(500));
    }
}

void setup() {
    Serial.begin(115200);
    
    // Setup OTA
    remoteUpdate.begin(WIFI_SSID, WIFI_PASS, OTA_PASS);

    Serial.println("\n\n=== FIRMWARE V2 (MODULAR) ===");

    // Setup Comm Module
    Serial.println("Initializing SIM7600 (4G)...");
    if (!comm.begin()) {
        Serial.println("❌ SIM7600 Init Failed! Check Power/Wiring.");
    } else {
        Serial.println("✅ SIM7600 Ready & Connected to LTE");
    }

    // Init SIM Serial
    comm.begin();
    
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
    // xTaskCreate(TaskTelemetry, "Telemetry_Task", 8192, NULL, 1, NULL);
    xTaskCreate(TaskGPS, "GPS_Task", 4096, NULL, 1, NULL);
    xTaskCreate(TaskMonitor, "Monitor_Task", 4096, NULL, 1, NULL);
    xTaskCreate(TaskBlink, "Blink_Task", 1024, NULL, 1, NULL);

    // Serial.println("✅ FreeRTOS Scheduler Started...");
    #endif

    #ifdef RUN_DIAGNOSTICS
    diagnostics.run(TEST_LAB_PASSTHROUGH);
    
    #endif
}

void loop() {
    vTaskDelete(NULL);
}