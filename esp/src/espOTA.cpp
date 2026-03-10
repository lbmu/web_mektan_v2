#include "espOTA.h"
#include <WiFi.h>
#include <ESPmDNS.h>
#include <ArduinoOTA.h>

ESP_OTA::ESP_OTA() {}

// Update: Implementasi menerima 3 parameter
void ESP_OTA::begin(const char* ssid, const char* password, const char* otaPassword) {
    
    // 1. Setup WiFi (AP Mode)
    WiFi.mode(WIFI_AP);
    WiFi.softAP(ssid, password);
    
    Serial.print("AP IP address: ");
    Serial.println(WiFi.softAPIP());

    // 2. Setup OTA
    ArduinoOTA.setHostname("Lorem_Ipsum");
    
    // --- PERBAIKAN DI SINI ---
    // Menggunakan variabel parameter, BUKAN string hardcode
    ArduinoOTA.setPassword(otaPassword); 
    // -------------------------

    ArduinoOTA.onStart([]() { Serial.println("Start updating"); });
    ArduinoOTA.onEnd([]() { Serial.println("\nEnd"); });
    ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
        Serial.printf("Progress: %u%%\r", (progress / (total / 100)));
    });
    ArduinoOTA.onError([](ota_error_t error) {
        Serial.printf("Error[%u]: ", error);
    });

    ArduinoOTA.begin();

    // 3. Create Task
    xTaskCreatePinnedToCore(
        ESP_OTA::otaTask, "OTA_Task", 4096, NULL, 1, NULL, 0
    );
}

void ESP_OTA::otaTask(void *pvParameters) {
    for (;;) {
        ArduinoOTA.handle();
        vTaskDelay(pdMS_TO_TICKS(20));
    }
}