// Modul untuk PlatformIO
#include <Arduino.h>

// Modul untuk OTA
#include <espOTA.h>

/* @brief
 * semua data sensitif meliputi SSID, PASS, OTA PASS
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
#define RUN_TASK // <- Buat run task biasa
// #define RUN_DIAGNOSTICS // <-- Buat DIAGNOSIS SISTEM
// #define REPORT

// Instansiasi Objek Modul Baru
ESP_OTA Ota;
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
TaskHandle_t telnetTaskHandle = NULL;
TaskHandle_t telemetryTaskHandle = NULL;
TaskHandle_t gpsTaskHandle = NULL;
TaskHandle_t monitorHandle = NULL;

// Task 0: OTA Debug

#ifdef USE_TELNET_DEBUG
ESPTelnet telnet;

void TaskTelnet(void *pvParameters) {
    // [Opsional] Event Handler agar muncul notifikasi saat laptop terhubung/terputus
    telnet.onConnect([](String ip) {
        Serial.print("\n=== [TELNET] LAPTOP TERHUBUNG DARI IP: "); Serial.println(ip);
        telnet.println("\n=== Hai, saya menggunakan Telnet ===");
        // telnet.println("Ketik 'help' untuk melihat daftar perintah.");
        // telnet.print("\n> ");
    });
    
    telnet.onDisconnect([](String ip) {
        Serial.print("\n=== [TELNET] LAPTOP TERPUTUS: "); Serial.println(ip);
    });

    telnet.onInputReceived([](String str) {
        Ota.processTelnetCommand(str);
        telnet.print("\n>");
    });

    while (1) {
        DEBUG_HANDLE(); // Menjalankan telnet.loop()
        vTaskDelay(20 / portTICK_PERIOD_MS); // Polling setiap 20ms
    }
}

#endif

// Task 1: Telemetry via 4G (MQTT HiveMQ)
void TaskTelemetry(void *pvParameters) {
    static bool lteConnected = false;
    static bool mqttConnected = false; 

    // Penghitung kegagalan
    static int mqttFailCount = 0;

    // Variabel untuk jeda publish tanpa blocking
    unsigned long lastPublishTime = 0;
    const unsigned long PUBLISH_INTERVAL = 5000; // 5 detik

    while (1) {
        // 1. Cek Koneksi Jaringan 4G
        if (!lteConnected) {
            DEBUG_PRINTLN("\n📡 [TELEMETRY] Modem belum siap. Mencoba inisialisasi...");
            if (comm.begin()) {
                lteConnected = true;
                mqttFailCount = 0;
            } else {
                DEBUG_PRINTLN("❌ [TELEMETRY] Gagal Connect 4G. Coba lagi 2 detik...");
                vTaskDelay(2000 / portTICK_PERIOD_MS); 
                continue; 
            }
        }

        // 2. Cek Koneksi ke Broker MQTT
        if (lteConnected && !mqttConnected) {
            DEBUG_PRINTLN("📡 [TELEMETRY] Menghubungkan ke Broker HiveMQ...");
            
            if (comm.connectMQTT(MQTT_BROKER, MQTT_PORT, MQTT_CLIENT_ID, MQTT_USER, MQTT_PASS)) {
                DEBUG_PRINTLN("✅ [TELEMETRY] Terhubung ke Broker! Siap publish data.");
                mqttConnected = true;
                mqttFailCount = 0;
            } else {
                mqttFailCount++;
                DEBUG_PRINTF("⚠️ [TELEMETRY] Gagal Connect MQTT (Percobaan %d/3)\n", mqttFailCount);
                if (mqttFailCount >= 3) {
                    DEBUG_PRINTLN("🔄 [TELEMETRY] Internet/Sinyal putus! Me-reset Modem 4G...");
                    lteConnected = false;
                }
                vTaskDelay(3000 / portTICK_PERIOD_MS); 
                continue; 
            }
        }

        // 3. JAGA KONEKSI (Keep-Alive TLS & MQTT)
        if (mqttConnected) {
            comm.loop();
        }

        // 4. Rakit JSON & Publish HANYA setiap 5 detik
        if (mqttConnected && (millis() - lastPublishTime >= PUBLISH_INTERVAL)) {
            String jsonPayload = "";
            bool readyToSend = false;

            if (xSemaphoreTake(dataMutex, (TickType_t) 100) == pdTRUE) {
                jsonPayload = "{";

                // cek NaN GPS
                if (isnan(latestData.lat) || isnan(latestData.lng)) {
                    jsonPayload += "\"lat\":null,";
                    jsonPayload += "\"lng\":null,";
                }
                else {
                    jsonPayload += "\"lat\":" + String(latestData.lat, 6) + ",";
                    jsonPayload += "\"lng\":" + String(latestData.lng, 6) + ",";
                }
                // cek NaN INA219
                if (isnan(latestData.voltage_V) || isnan(latestData.power_mW)) {
                    jsonPayload += "\"voltage\":null,";
                    jsonPayload += "\"power\":null";
                }
                else {
                    jsonPayload += "\"voltage\":" + String(latestData.voltage_V, 2) + ",";
                    jsonPayload += "\"power\":" + String(latestData.power_mW, 2);
                }
                jsonPayload += "}";
                
                readyToSend = true;
                xSemaphoreGive(dataMutex);
            }

            if (readyToSend) {
                // DEBUG_PRINTLN("\n---------------------------------------");
                // DEBUG_PRINTLN("----📡 Mempublikasikan Data via MQTT---");
                if (comm.publishMQTT(MQTT_TOPIC, jsonPayload)) {
                    #ifdef REPORT
                    // DEBUG_PRINTLN("----✅ Data Published Successfully!----");
                    #endif
                } else {
                    // DEBUG_PRINTLN("----❌ Publish Failed (Cek Koneksi?)---");
                    mqttConnected = false; // Reset agar mencoba re-connect
                }
                DEBUG_PRINTLN("---------------------------------------");
            }
            
            lastPublishTime = millis(); // Reset timer publish
        }

        // Delay sangat pendek (50ms) agar task FreeRTOS tidak monopoli CPU,
        // namun cukup sering untuk memanggil comm.loop() dengan lancar
        vTaskDelay(50 / portTICK_PERIOD_MS);
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
                if (gpsHandler.isValid() && gpsHandler.getAge() < 5000) {
                    latestData.lat = gpsHandler.getLat();
                    latestData.lng = gpsHandler.getLng();
                    latestData.gpsUpdated = true;
                }
                else {
                    latestData.lat = NAN;
                    latestData.lng = NAN;
                    latestData.gpsUpdated = false;
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
        #ifdef REPORT
        DEBUG_PRINTLN("\n--- [TASK] Power & Location Report ---");

        DEBUG_PRINT("Bus Voltage : "); DEBUG_PRINT(pData.busVoltage_V); DEBUG_PRINTLN(" V");
        DEBUG_PRINT("Shunt Volt  : "); DEBUG_PRINT(pData.shuntVoltage_mV); DEBUG_PRINTLN(" mV");
        DEBUG_PRINT("Load Voltage: "); DEBUG_PRINT(pData.loadVoltage_V); DEBUG_PRINTLN(" V");
        DEBUG_PRINT("Current     : "); DEBUG_PRINT(pData.current_mA); DEBUG_PRINTLN(" mA");
        DEBUG_PRINT("Power       : "); DEBUG_PRINT(pData.power_mW); DEBUG_PRINTLN(" mW");

        if (validGPS) {
            DEBUG_PRINTF("GPS         : %.6f, %.6f\n", currentLat, currentLng);
        } else {
            DEBUG_PRINTLN("GPS         : Waiting for lock...");
        }
        DEBUG_PRINTLN("---------------------------------------------------");
        #endif

        vTaskDelay(2000 / portTICK_PERIOD_MS);
    }
}

void setup() {

    Serial.begin(115200);
    Serial.println("--Booting System...--");
    
    // Setup OTA
    Ota.begin(WIFI_SSID, WIFI_PASS, OTA_PASS);
    delay(500);

    // buka port 23
    DEBUG_BEGIN();

    DEBUG_PRINTLN("\n\n===| FIRMWARE V2 |===");

    // Setup Comm Module
    DEBUG_PRINTLN("Initializing SIM7600 (4G)...");
    // Coba sekali di awal (opsional, karena TaskTelemetry juga bakal coba)
    // Tapi bagus untuk UX agar user tahu status awal
    if (!comm.begin()) {
        DEBUG_PRINTLN("⚠️ Init Awal Gagal (Akan dicoba ulang di Telemetry Task)");
        // Jangan stop program, biarkan lanjut ke scheduler
    } else {
        DEBUG_PRINTLN("✅ SIM7600 Ready");
    }
    
    // Init GPS Module
    gpsHandler.begin(9600);

    // Init Power Module
    if (!powerMonitor.begin()) {
        DEBUG_PRINTLN("❌ INA219 Not Found!");
    } else {
        DEBUG_PRINTLN("✅ INA219 Connected");
    }

    // Create Mutex
    dataMutex = xSemaphoreCreateMutex();
    
    #ifdef USE_TELNET_DEBUG
    xTaskCreatePinnedToCore(
        TaskTelnet, "Telnet_Task", 4096, NULL, 1, &telnetTaskHandle, 1
    );
    #endif

    #ifdef RUN_TASK
    xTaskCreatePinnedToCore(
        TaskTelemetry, "Telemetry_Task", 8192, NULL, 1, &telemetryTaskHandle, 0
    );
    xTaskCreatePinnedToCore(
        TaskGPS, "GPS_Task", 4096, NULL, 1, &gpsTaskHandle, 1
    );
    xTaskCreatePinnedToCore(
        TaskMonitor, "Monitor_Task", 4096, NULL, 1, &monitorHandle, 1
    );
    #endif
    
    // Gunakan untuk diagnosis sistem
    #ifdef RUN_DIAGNOSTICS
    // diagnostics.run(TEST_LAB_PASSTHROUGH); // Yang ini buat tes GPS dalem ruangan (Cek modul doang, belum bisa ngirim koordinat)
    // diagnostics.run(TEST_SIM_PASSTHROUGH); // Yang ini buat ngirimin AT Command
    #endif
    diagnostics.run(TEST_PERFORMANCE_MONITOR);
}

void loop() {
    vTaskDelete(NULL);
}