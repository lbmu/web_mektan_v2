#pragma once

#include <Arduino.h>

class CommHandler {
public:
    // Constructor menerima pin RX, TX dan Baudrate
    CommHandler(int rxPin, int txPin, long baudRate, int serialPort);

    // Inisialisasi modul & koneksi ke jaringan
    bool begin();

    bool connectMQTT(String broker, int port, String clientId, String user = "", String pass = "");
    bool publishMQTT(String topic, String payload);

    // Meneruskan data AT Command
    void serialPassthrough();

private:
    int _rxPin;
    int _txPin;
    long _baudRate;
    HardwareSerial* _serialAT;

    // Fungsi helper internal untuk kirim perintah AT
    String sendATCommand(String command, int timeout, String expectedResponse);
    bool configureNetwork();
};