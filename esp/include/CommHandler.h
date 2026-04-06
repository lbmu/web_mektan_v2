#pragma once

// Wajib didefinisikan SEBELUM include TinyGsmClient.h
#define TINY_GSM_YIELD() { vTaskDelay(1/portTICK_PERIOD_MS); }
#define TINY_GSM_MODEM_SIM7600 

#include <Arduino.h>
#include <TinyGsmClient.h>
#include <ESP_SSLClient.h>
#include <PubSubClient.h>

class CommHandler {
public:
    CommHandler(int rxPin, int txPin, long baudRate, int serialPort);

    bool begin();
    bool connectMQTT(String broker, int port, String clientId, String user = "", String pass = "");
    bool publishMQTT(String topic, String payload);
    
    // Wajib dipanggil berkala agar PubSubClient tidak terputus
    void loop(); 

    // Meneruskan data untuk SystemDiagnostics
    void serialPassthrough();

    // GPS
    bool enableGNSS();
    bool disableGNSS();
    bool getGNSSData(
        float *lat,
        float *lng,
        float *speed = 0,
        float *alt = 0,
        int *vsat = 0,
        int *usat = 0,
        float *accuracy = 0
    );

private:
    int _rxPin;
    int _txPin;
    long _baudRate;
    HardwareSerial* _serialAT;

    // Objek Jaringan (4 Lapis)
    TinyGsm* _modem;
    TinyGsmClient* _baseClient;
    ESP_SSLClient* _secureClient;
    PubSubClient* _mqtt;

    bool configureNetwork();
};