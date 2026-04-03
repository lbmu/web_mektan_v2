#pragma once
#include <Arduino.h>

// Berikan komentar pada baris di bawah ini jika ingin mematikan Telnet sepenuhnya
#define USE_TELNET_DEBUG

#ifdef USE_TELNET_DEBUG
    #include <ESPTelnet.h>
    
    // Deklarasi Global (Instansiasinya ada di main.cpp)
    extern ESPTelnet telnet;

    inline void debugBegin() {
        // begin(port, checkConnection)
        // Set checkConnection ke 'false' agar tembus Mode AP tanpa mengecek WiFi.status()
        telnet.begin(23, false); 
    }

    inline void debugHandle() {
        telnet.loop(); // Menjaga server tetap hidup dan merespon
    }

    #define DEBUG_BEGIN()       debugBegin()
    #define DEBUG_HANDLE()      debugHandle()
    
    // Cetak ke Telnet DAN Serial kabel secara bersamaan
    #define DEBUG_PRINT(x)      telnet.print(x); Serial.print(x)
    #define DEBUG_PRINTLN(x)    telnet.println(x); Serial.println(x)
    #define DEBUG_PRINTF(...)   telnet.printf(__VA_ARGS__); Serial.printf(__VA_ARGS__)
    #define DEBUG_WRITE(x)      telnet.write(x); Serial.write(x)

#else
    #define DEBUG_BEGIN()       
    #define DEBUG_HANDLE()
    #define DEBUG_PRINT(x)      Serial.print(x)
    #define DEBUG_PRINTLN(x)    Serial.println(x)
    #define DEBUG_PRINTF(...)   Serial.printf(__VA_ARGS__)
    #define DEBUG_WRITE(x)      Serial.write(x)
#endif

class ESP_OTA {
public:
    ESP_OTA();
    void begin(const char* ssid, const char* password, const char* otaPassword);
    void processTelnetCommand(String cmd);

private:
    static void otaTask(void *pvParameters);
};