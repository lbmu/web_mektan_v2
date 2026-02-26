#pragma once

#include <Arduino.h>

class CommHandler {
public:
    // Constructor menerima pin RX, TX dan Baudrate
    CommHandler(int rxPin, int txPin, long baudRate, int serialPort);

    // Inisialisasi modul & koneksi ke jaringan
    bool begin();

    // Mengirim data ke server (POST Request)
    // Mengembalikan true jika server merespons HTTP 200 OK
    bool sendData(String url, String jsonData);

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