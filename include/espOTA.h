#ifndef ESP_OTA_H
#define ESP_OTA_H

#include <Arduino.h> // Wajib di PlatformIO

class ESP_OTA {
public:
    ESP_OTA();
    void begin(const char* ssid, const char* password, const char* otaPassword);

private:
    static void otaTask(void *pvParameters);
};

#endif