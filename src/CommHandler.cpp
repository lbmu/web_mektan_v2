#include "CommHandler.h"

CommHandler::CommHandler(int rxPin, int txPin, long baudRate, int serialPort) 
    : _rxPin(rxPin), _txPin(txPin), _baudRate(baudRate) {
    _serialAT = new HardwareSerial(serialPort);
}

bool CommHandler::begin() {
    _serialAT->begin(_baudRate, SERIAL_8N1, _rxPin, _txPin);
    delay(3000); // Tunggu modul booting

    // 1. Cek Koneksi Dasar
    if (sendATCommand("AT", 1000, "OK") == "") return false;

    // 2. Matikan Echo agar respon bersih
    sendATCommand("ATE0", 1000, "OK");

    // 3. Konfigurasi Jaringan (APN)
    return configureNetwork();
}

bool CommHandler::configureNetwork() {
    // BEDA UTAMA: SIM7600 menggunakan CGDCONT untuk LTE Context
    // Ganti "internet" dengan APN provider Anda (misal: "telkomsel", "indosatgprs")
    sendATCommand("AT+CGDCONT=1,\"IP\",\"internet\"", 2000, "OK");

    // Cek registrasi jaringan LTE (CEREG) bukan cuma CREG
    // 0,1 = Registered Home Network, 0,5 = Roaming (masih oke)
    String reg = sendATCommand("AT+CEREG?", 1000, "+CEREG: 0,1");
    if (reg == "") {
        reg = sendATCommand("AT+CEREG?", 1000, "+CEREG: 0,5");
    }
    
    return reg != ""; // Return true jika terdaftar
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
    }
    // Debugging (Opsional)
    Serial.print("CMD: "); Serial.println(command);
    Serial.print("RSP: "); Serial.println(response);
    vTaskDelay(10 / portTICK_PERIOD_MS);
    return ""; // Timeout atau fail
}