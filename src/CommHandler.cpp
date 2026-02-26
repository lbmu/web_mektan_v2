#include "CommHandler.h"

CommHandler::CommHandler(int rxPin, int txPin, long baudRate, int serialPort) 
    : _rxPin(rxPin), _txPin(txPin), _baudRate(baudRate) {
    _serialAT = new HardwareSerial(serialPort);
}

bool CommHandler::begin() {
    _serialAT->begin(_baudRate, SERIAL_8N1, _rxPin, _txPin);
    delay(20000); // Tunggu modul booting

    // 1. Cek Koneksi Dasar
    if (sendATCommand("AT", 1000, "OK") == "") return false;

    // 2. Matikan Echo agar respon bersih
    sendATCommand("ATE0", 1000, "OK");

    // 3. Konfigurasi Jaringan (APN)
    return configureNetwork();
}

bool CommHandler::configureNetwork() {
    // 1. Set APN (Penting!)
    sendATCommand("AT+CGDCONT=1,\"IP\",\"internet\"", 2000, "OK");

    // 2. Loop menunggu registrasi (Maksimal 30 detik)
    // Kita tunggu sampai statusnya 0,1 (Home) atau 0,5 (Roaming)
    int maxRetries = 15; // 15 x 2 detik = 30 detik
    
    Serial.print("Menunggu Sinyal 4G...");
    
    for (int i = 0; i < maxRetries; i++) {
        String response = sendATCommand("AT+CEREG?", 1000, "OK");
        
        // Cek apakah ada "0,1" atau "0,5" di dalam respon
        if (response.indexOf("0,1") != -1 || response.indexOf("0,5") != -1) {
            Serial.println(" SIAP!\n");
            return true; // Berhasil!
        }
        
        if (response.indexOf("0,4") != -1) {
             Serial.print(" (Unknown).\n");
        } else if (response.indexOf("0,2") != -1) {
             Serial.print(" (Searching).\n");
        } else {
             Serial.print(".");
        }
        
        // Tunggu 2 detik sebelum tanya lagi
        vTaskDelay(2000 / portTICK_PERIOD_MS);
    }

    Serial.println(" Gagal/Timeout!");
    return false; // Nyerah setelah 30 detik
}

bool CommHandler::sendData(String url, String jsonData) {
    // 1. Inisialisasi HTTP Service
    sendATCommand("AT+HTTPINIT", 1000, "OK");

    // 2. Set Parameter URL & Content Type
    sendATCommand("AT+HTTPPARA=\"URL\",\"" + url + "\"", 1000, "OK");
    sendATCommand("AT+HTTPPARA=\"CONTENT\",\"application/json\"", 1000, "OK");

    // 3. Masukkan Data JSON
    // Command: AT+HTTPDATA=<latency>,<time>
    String cmdData = "AT+HTTPDATA=" + String(jsonData.length()) + ",10000";
    _serialAT->println(cmdData);
    
    // Tunggu prompt "DOWNLOAD" dari modem
    delay(100); 
    // Kirim Payload
    _serialAT->print(jsonData);
    
    // Tunggu OK setelah kirim data
    delay(1000); 

    // 4. Eksekusi POST (Action 1 = POST, 0 = GET)
    // Respon format: +HTTPACTION: 1,200,xxxx (Method, StatusCode, DataLen)
    String response = sendATCommand("AT+HTTPACTION=1", 10000, "+HTTPACTION: 1,200");
    
    bool success = (response.indexOf("200") != -1);

    // 5. Matikan HTTP Service (Penting di SIM7600 agar tidak hang)
    sendATCommand("AT+HTTPTERM", 1000, "OK");

    return success;
}

// Helper Function: Kirim AT dan tunggu respon spesifik
String CommHandler::sendATCommand(String command, int timeout, String expectedResponse) {
    _serialAT->println(command);
    String response = "";
    unsigned long start = millis();

    while (millis() - start < timeout) {
        while (_serialAT->available()) {
            char c = _serialAT->read();
            response += c;
        }
        if (response.indexOf(expectedResponse) != -1) {
            return response;
        }
        // Memberikan waktu 10ms bagi FreeRTOS untuk menjalankan task IDLE & Watchdog
        vTaskDelay(10 / portTICK_PERIOD_MS); 
    }
    
    // Debugging (Opsional)
    Serial.print("CMD: "); Serial.println(command);
    Serial.print("RSP: "); Serial.println(response);
    
    return ""; // Timeout atau fail
}

void CommHandler::serialPassthrough() {
    // 1. Dari Laptop (Keyboard) --> Kirim ke Modul SIM7600
    while (Serial.available()) {
        char c = Serial.read();
        _serialAT->write(c);
    }
    
    // 2. Dari Modul SIM7600 --> Tampilkan ke Laptop
    while (_serialAT->available()) {
        char c = _serialAT->read();
        Serial.write(c);
    }
}