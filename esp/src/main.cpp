// Modul untuk PlatformIO
#include <Arduino.h>

// Modul untuk OTA

#include "espOTA.h"

/* @brief
 * semua data sensitif meliputi SSID, PASS, OTA PASS
 * didefinisikan di file 'secrets.h'
 * agar mudah diatur tanpa mengubah kode utama
 * dan menghindari upload data sensitif ke repo publik 
 * brief ini di-generate sama CoPilot VS Code btw
 * makanya bahasa nya semi baku
 */

// Modul untuk sistem
#include "secrets.h"
#include "GpsHandler.h"
#include "PowerMonitor.h"
#include "CommHandler.h"
#include "SystemDiagnostics.h"
#include "DataHandler.h"

/* @brief
 * pinout juga sama 
 * disimpen di pinout.h
 * biar kalo ngulik-ngulik gausah buka main.cpp (bosen)
 */

#include "pinout.h"

// ==================================================
// KONFIGURASI MODE OPERASI (PILIH SALAH SATU)
// ==================================================
#define RUN_TASK 
// #define RUN_DIAGNOSTICS 
// #define RUN_SIMULATION 

// ==================================================
// SAFETY CHECK: Mencegah Multiple Define
// ==================================================
#if (defined(RUN_TASK) + defined(RUN_DIAGNOSTICS) + defined(RUN_SIMULATION)) > 1
    #error "💥 KESALAHAN KOMPILASI: Bentrok Mode Terdeteksi! Pastikan hanya SATU mode (#define) yang aktif."
#elif (defined(RUN_TASK) + defined(RUN_DIAGNOSTICS) + defined(RUN_SIMULATION)) == 0
    #warning "⚠️ PERINGATAN: Tidak ada mode operasi yang diaktifkan. Mikrokontroler hanya akan booting lalu idle."
#endif
// ==================================================

// Misc
// #define REPORT
// #define PAPER

// Instansiasi Objek Modul Baru
ESP_OTA Ota;
CommHandler comm(SIM_RX_PIN, SIM_TX_PIN, COMM_BAUDRATE, SIM_SERIAL_PORT);
GpsHandler gpsHandler(GPS_RX_PIN, GPS_TX_PIN, GPS_SERIAL_PORT);
PowerMonitor powerMonitor;
DataHandler dataHandler;
DataManager data;
SystemDiagnostics diagnostics(&powerMonitor, &gpsHandler, &comm);

// --- SHARED DATA & MUTEX ---
// Struktur data bersama antar task

// --- VARIABEL dan PENDUKUNG ---
SharedData latestData;
SemaphoreHandle_t dataMutex;

// --- FUNCTION ---
unsigned long getCurrentTimestamp() {
    unsigned long ts = 0;

    // ambil dari modul SIM
    ts = comm.getNetworkTimestamp();
    if (ts > 1000000000) {
        // DEBUG_PRINT("✅ [TIME] Source: SIM7600 | UNIX Epoch: ");
        // DEBUG_PRINTLN(ts);
        return ts;
    }

    // ambil dari gps
    if (gpsHandler.isValid()) {
        ts = gpsHandler.getUnixTime();
        if (ts > 1000000000) {
        // DEBUG_PRINT("✅ [TIME] Source: GPS | UNIX Epoch: ");
        // DEBUG_PRINTLN(ts);
        return ts;
        }
    }

    // pasrah
    ts = time(NULL);
    DEBUG_PRINT("⚠️ [TIME] Source: Internal ESP32 (Akurasi Rendah) | UNIX Epoch: ");
    DEBUG_PRINTLN(ts);
    return ts;
}

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
    // Variabel untuk jeda publish tanpa blocking
    unsigned long lastPublishTime = 0;
    unsigned long lastSaveTime = 0;

    // Manajemen Daya
    const float ENGINE_ON_V = 4.0;
    const float ENGINE_OFF_V = 3.5;

    // yang ini interval ngirim data tergantung nyala mesin (5/60 detik)
    const unsigned long OFFLINE_SAVE_INTERVAL = 5000;
    const unsigned long ACTIVE_INTERVAL = 5000;
    const unsigned long HEARTBEAT_INTERVAL = 60000;

    unsigned long currentPublishInterval = ACTIVE_INTERVAL;
    bool isEngineOn = true;

    // --- TAMBAHAN UNTUK INISIALISASI NON-BLOCKING ---
    bool isColdBoot = (esp_reset_reason() == ESP_RST_POWERON);
    // Jika cold boot, tunggu 60 detik. Jika restart biasa (warm boot), cukup 10 detik.
    const unsigned long WARMUP_DURATION = isColdBoot ? 30000 : 10000;
    unsigned long taskStartTime = millis();
    bool isSimReady = false;

    if (isColdBoot) {
        DEBUG_PRINTLN("\n⏳ [TELEMETRY] Cold Boot Terdeteksi. Menjalankan timer pemanasan SIM7600 di background...");
    }

    while (1) {
        bool isOnline = false;

        // 1. Cek Koneksi Jaringan & Inisialisasi Modul
        if (millis() - taskStartTime < WARMUP_DURATION) {
            // Selama fase inisialisasi, status SELALU offline.
            // skip comm.maintainConnection() agar terhindar dari freeze/blocking.
            isOnline = false;
        } else {
            if (!isSimReady) {
                DEBUG_PRINTLN("\n✅ [TELEMETRY] Waktu pemanasan SIM selesai. Mulai menghubungkan...");
                isSimReady = true;
            }
            // 2. JAGA KONEKSI (Baru dilakukan setelah modul siap)
            isOnline = comm.maintainConnection();
        }

        // 4. Protokol Publish / Save Data
        bufferedData currentData;
        static int sampleCount = 0;
        unsigned long latency = 0;
        unsigned long startTime = micros();

        // Sinkronisasi Mutex
        if (xSemaphoreTake(dataMutex, (TickType_t) 10) == pdTRUE) {
            latency = micros() - startTime;
            currentData.lat = latestData.lat;
            currentData.lng = latestData.lng;
            currentData.hdop = latestData.hdop;
            currentData.sat = latestData.sat;
            currentData.voltage_V = latestData.voltage_V;
            currentData.current_mA = latestData.current_mA;
            currentData.fuel_R = latestData.fuel_R;
        
            xSemaphoreGive(dataMutex);
        }

        // Ambil timestamp (jika SIM mati, fungsi ini akan coba pakai data M8N atau fallback)
        currentData.timestamp = getCurrentTimestamp();

        ////////////////////////////
        // Logika Pengiriman Data //
        ////////////////////////////

        if (isOnline) {
            // Cek data buffer di LittleFS
            if (dataHandler.hasData()) {
                File file = dataHandler.openForRead();
                if (file) {
                    bufferedData oldData;
                    bool allSent = true;
                    while (file.available() >= sizeof(bufferedData)) {
                        file.read((uint8_t*)&oldData, sizeof(bufferedData));
                        String oldJson = dataHandler.buildJson(oldData, String(DEVICE_ID));

                        if (comm.publishMQTT(MQTT_TOPIC, oldJson)) {
                            DEBUG_PRINT("📦");
                            vTaskDelay(200 / portTICK_PERIOD_MS);
                        } else {
                            DEBUG_PRINTLN("⚠️");
                            allSent = false;
                            break;
                        }
                    }
                    file.close();

                    if (allSent) {
                        dataHandler.clearData();
                        DEBUG_PRINTLN("🗑️");
                    }
                }
            }
            
            // Kalau gak ada buffer, kirim data aktual (real-time)
            if (millis() - lastPublishTime >= ACTIVE_INTERVAL) {
                String currentJson = dataHandler.buildJson(currentData, String(DEVICE_ID));

                // Kirim data (real-time)
                if (comm.publishMQTT(MQTT_TOPIC, currentJson)) {
                    lastPublishTime = millis();
                }
                
                #ifdef PAPER
                if (sampleCount < 500) {
                    sampleCount++;
                    DEBUG_PRINT(sampleCount);
                    DEBUG_PRINT(";");
                    DEBUG_PRINT(latency);
                    DEBUG_PRINT(";");
                    DEBUG_PRINTLN(currentJson);
                }
                #endif
            }                
        }
        
        // Modul komunikasi belum ter-inisialisasi (warmup) ATAU sedang offline
        else {
            if (millis() - lastSaveTime >= currentPublishInterval) {
                if (dataHandler.saveData(currentData)) {
                    DEBUG_PRINT("💾");
                } else {
                    DEBUG_PRINTLN("⚠️");
                }
                lastSaveTime = millis();
            }
        }
        
        // Jeda ringan agar RTOS tidak monopoli Core
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
                    latestData.hdop = gpsHandler.getHDOP();
                    latestData.sat = gpsHandler.getSatellites();
                    latestData.gpsUpdated = true;
                }
                else {
                    latestData.isM8NActive = false;

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
        // float fuel = 0;

        // --- UPDATE SHARED DATA ---
        double currentLat = 0.0;
        double currentLng = 0.0;
        int hdop;
        int sat;
        bool validGPS = false;

        if (xSemaphoreTake(dataMutex, (TickType_t) 10) == pdTRUE) {
            currentLat = latestData.lat;
            currentLng = latestData.lng;
            validGPS = latestData.gpsUpdated;
            hdop = latestData.hdop;
            sat = latestData.sat;
            
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
        DEBUG_PRINTF("GPS        : %.6f, %.6f\n", currentLat, currentLng);
        DEBUG_PRINTF("Sat        : %d\n", sat);
        DEBUG_PRINTF("HDOP       : %d\n", hdop);


        DEBUG_PRINTLN("---------------------------------------------------");
        #endif

        vTaskDelay(2000 / portTICK_PERIOD_MS);
    }
}

void setup() {

    Serial.begin(115200);
    Serial.println("==================================================");
    Serial.println("================[ BOOTING SYSTEM ]================");
    Serial.println("==================================================");
    Serial.println("");

    // Setup OTA
    Serial.println("===============[ Initializing OTA ]===============");
    Ota.begin(WIFI_SSID, WIFI_PASS, OTA_PASS);
    delay(500);

    // buka port 23

    DEBUG_BEGIN();
    DEBUG_PRINTLN("==================================================");
    DEBUG_PRINTLN("");

    // init littleFS
    Serial.println("=======[ Initializing Fail-Safe Mechanism]=======");
    dataHandler.begin();
    DEBUG_PRINTLN("==================================================");
    DEBUG_PRINTLN("");
    
    // Init GPS Module
    DEBUG_PRINTLN("===============[ Initializing GPS ]===============");

    if (!gpsHandler.begin(9600)) {
        DEBUG_PRINTLN("❌ GPS Not Found!");
    } else {
        DEBUG_PRINTLN("✅ GPS Connected");
    }
    DEBUG_PRINTLN("==================================================");
    DEBUG_PRINTLN("");
    
    // Init Power Module
    DEBUG_PRINTLN("===============[ Initializing INA ]===============");
    if (!powerMonitor.begin()) {
        DEBUG_PRINTLN("❌ INA219 Not Found!");
    } else {
        DEBUG_PRINTLN("✅ INA219 Connected");
    }
    
    DEBUG_PRINTLN("==================================================");
    DEBUG_PRINTLN("");

    // Init Modul 4G
    DEBUG_PRINTLN("===============[ Initializing SIM ]===============");
    comm.configMQTT(MQTT_BROKER, MQTT_PORT, MQTT_CLIENT_ID, MQTT_USER, MQTT_PASS);
    DEBUG_PRINTLN("==================================================");
    DEBUG_PRINTLN("");

    // Create Mutex
    dataMutex = xSemaphoreCreateMutex();
    
    // Telnet Debug
    #ifdef USE_TELNET_DEBUG
    xTaskCreatePinnedToCore(
        TaskTelnet, "Telnet_Task", 4096, NULL, 1, &telnetTaskHandle, 1
    );
    #endif

    // Simulasi
    #ifdef RUN_SIMULATION
    DEBUG_PRINTLN("===============[ Simulation Mode ]================");
    xTaskCreatePinnedToCore(
        TaskTelemetry, "Telemetry_Task", 8192, NULL, 1, &telemetryTaskHandle, 0
    );
    diagnostics.run(TEST_SIMULATION);
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
    // uncomment baris di bawah biar sistemnya keliatan kompleks :v
    diagnostics.run(TEST_PERFORMANCE_MONITOR);
    #endif
    
    // Gunakan untuk diagnosis sistem
    #ifdef RUN_DIAGNOSTICS
    // diagnostics.run(TEST_NMEA_PASSTHROUGH); // Yang ini buat tes GPS dalem ruangan (Cek modul doang, belum bisa ngirim koordinat)
    // diagnostics.run(TEST_SIM_PASSTHROUGH); // Yang ini buat ngirimin AT Command
    // diagnostics.run(TEST_STORAGE_MONITOR);
    #endif
}

void loop() {
    vTaskDelete(NULL);
}

// Ini kalau udah nyampe 500 baris [ternyata sudah] , mikro nya LANGSUNG FREEZE FEATURE. padahal kode udah modular jir, tapi kayanya ga ngaruh :v [masih spaghetti code juga]