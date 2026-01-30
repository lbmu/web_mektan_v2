#include <Arduino.h>
#include <Wire.h>
#include <TinyGPS++.h>
#include <Adafruit_INA219.h>
#include <espOTA.h>
#include <secrets.h>

// --- CONFIGURATION ---
#define SIM_RX_PIN 16
#define SIM_TX_PIN 17
#define GPS_RX_PIN 32
#define GPS_TX_PIN 33

HardwareSerial SerialAT(2);
HardwareSerial SerialGPS(1);

TinyGPSPlus gps;
Adafruit_INA219 ina219;
ESP_OTA remoteUpdate;

// --- SHARED DATA & MUTEX ---
// This struct holds the latest data so tasks can share it safely
struct SharedData {
    double lat;
    double lng;
    float power_mW;
    float voltage_V;
    float current_mA; // NEW: Added this to match the new logic
    bool gpsUpdated;
};

SharedData latestData;
SemaphoreHandle_t dataMutex; // The "Key" to access latestData

// --- TASKS ---

// Task 1: Fast & Furious (Reads GPS constantly)
void TaskGPS(void *pvParameters) {
    while (1) {
        // 1. Read Raw Serial Data
        while (SerialGPS.available() > 0) {
            if (gps.encode(SerialGPS.read())) {
                
                // 2. Lock the Mutex (Take the key)
                if (xSemaphoreTake(dataMutex, (TickType_t) 10) == pdTRUE) {
                    // 3. Write Data safely
                    if (gps.location.isValid()) {
                        latestData.lat = gps.location.lat();
                        latestData.lng = gps.location.lng();
                        latestData.gpsUpdated = true;
                    }
                    // 4. Unlock (Return the key)
                    xSemaphoreGive(dataMutex);
                }
            }
        }
        // Small delay to let the Watchdog Timer breathe
        vTaskDelay(10 / portTICK_PERIOD_MS); 
    }
}

// Task 2: Slow & Steady (Reads Sensors & Prints)
void TaskMonitor(void *pvParameters) {
    while (1) {
        // Initialize variables [1]
        float shuntvoltage = 0.0;
        float busvoltage = 0.0;
        float current_mA = 0.0;
        float loadvoltage = 0.0;
        float power_mW = 0.0;

        // --- READ SENSORS ---
        shuntvoltage = ina219.getShuntVoltage_mV(); // [1]
        busvoltage = ina219.getBusVoltage_V();      // [1]
        current_mA = ina219.getCurrent_mA();        // [1]
        power_mW = ina219.getPower_mW();            // [1]
        
        // Calculate Load Voltage: Bus + (Shunt / 1000)
        loadvoltage = busvoltage + (shuntvoltage / 1000); // [1]

        // --- UPDATE SHARED DATA ---
        double currentLat = 0.0;
        double currentLng = 0.0;
        bool validGPS = false;

        if (xSemaphoreTake(dataMutex, (TickType_t) 10) == pdTRUE) {
            currentLat = latestData.lat;
            currentLng = latestData.lng;
            validGPS = latestData.gpsUpdated;
            latestData.power_mW = power_mW;
            latestData.voltage_V = loadvoltage; // Store the calculated Load Voltage
            xSemaphoreGive(dataMutex);
        }

        // --- PRINT DETAILED REPORT (Source Logic) ---
        Serial.println("\n--- [TASK] Power & Location Report ---");

        // Detailed INA219 Printout [2]
        Serial.print("Bus Voltage : "); Serial.print(busvoltage); Serial.println(" V");
        Serial.print("Shunt Voltage : "); Serial.print(shuntvoltage); Serial.println(" mV");
        Serial.print("Load Voltage : "); Serial.print(loadvoltage); Serial.println(" V");
        Serial.print("Current     : "); Serial.print(current_mA); Serial.println(" mA");
        Serial.print("Power       : "); Serial.print(power_mW); Serial.println(" mW");

        if (validGPS) {
            Serial.printf("GPS         : %.6f, %.6f\n", currentLat, currentLng);
        } else {
            Serial.println("GPS         : Waiting for lock...");
        }
        Serial.println("---------------------------------------------------"); // [3]

        vTaskDelay(2000 / portTICK_PERIOD_MS); // Updated to 2000ms [3]
    }
}

void TaskBlink(void *pvParameters) {
    pinMode(2, OUTPUT); // GPIO 2 adalah Built-in LED ESP32 DevKit
    for (;;) {
        digitalWrite(2, HIGH); // Nyala
        vTaskDelay(pdMS_TO_TICKS(500)); // Cepat (5x per detik)
        digitalWrite(2, LOW);  // Mati
        vTaskDelay(pdMS_TO_TICKS(500));
    }
}

void setup() {
    Serial.begin(115200);
    
    // Inisialisasi OTA (Mode AP)
    remoteUpdate.begin(WIFI_SSID, WIFI_PASS, OTA_PASS);

    Serial.println("\n\n=========================================");
    Serial.println("STATUS: FIRMWARE V1 (BLINKING)");
    Serial.print("Built Time: ");
    Serial.print(__DATE__); 
    Serial.print(" ");
    Serial.println(__TIME__);
    Serial.println("=========================================\n");

    Serial.println("System Started...");
    // Init Hardware
    SerialAT.begin(115200, SERIAL_8N1, SIM_RX_PIN, SIM_TX_PIN);
    SerialGPS.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
    
    

    if (!ina219.begin()) {
        Serial.println("❌ INA219 Not Found!");
    }

    // Create Mutex
    dataMutex = xSemaphoreCreateMutex();

    // Create Tasks
    // xTaskCreate(Function, Name, Stack Size, Param, Priority, Handle)
    xTaskCreate(TaskGPS, "GPS_Task", 4096, NULL, 1, NULL);
    xTaskCreate(TaskMonitor, "Monitor_Task", 4096, NULL, 1, NULL);
    xTaskCreate(TaskBlink, "Blink_Task", 1024, NULL, 1, NULL);

    Serial.println("✅ FreeRTOS Scheduler Started...");
}

void loop() {
    // Empty! The Tasks handle everything now.

    vTaskDelete(NULL);
}