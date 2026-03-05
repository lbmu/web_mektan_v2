#include "CommHandler.h"

CommHandler::CommHandler(int rxPin, int txPin, long baudRate, int serialPort) 
    : _rxPin(rxPin), _txPin(txPin), _baudRate(baudRate) {
    _serialAT = new HardwareSerial(serialPort);
}

// Inisialisasi modul
bool CommHandler::begin() {
    _serialAT->begin(_baudRate, SERIAL_8N1, _rxPin, _txPin);
    delay(15000); // Tunggu modul booting

    // 1. Cek Koneksi Dasar
    if (sendATCommand("AT", 1000, "OK") == "") return false;

    // 2. Matikan Echo agar respon bersih
    sendATCommand("ATE0", 1000, "OK");

    // 3. Konfigurasi Jaringan (APN)
    return configureNetwork();
}

// Settingan sebelum konektivitas ke internet
bool CommHandler::configureNetwork() {
    // 1. Set APN
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

// MQTT Connect
bool CommHandler::connectMQTT(String broker, int port, String clientId, String user, String pass) {
    // 1. Start MQTT Service
    // Mengabaikan error jika service sudah pernah start sebelumnya
    sendATCommand("AT+CMQTTSTART", 2000, ""); 

    // 2. Acquire Client
    String accqCmd = "AT+CMQTTACCQ=0,\"" + clientId + "\"";
    if (sendATCommand(accqCmd, 2000, "OK") == "") return false;

    // 3. Connect ke Broker
    String connCmd;
    if (user == "" && pass == "") {
        // Tanpa Autentikasi
        connCmd = "AT+CMQTTCONNECT=0,\"tcp://" + broker + ":" + String(port) + "\",60,1";
    } else {
        // Dengan Autentikasi
        connCmd = "AT+CMQTTCONNECT=0,\"tcp://" + broker + ":" + String(port) + "\",60,1,\"" + user + "\",\"" + pass + "\"";
    }
    
    // Tunggu respon +CMQTTCONNECT: 0,0 yang menandakan sukses konek ke broker
    String connRes = sendATCommand(connCmd, 15000, "+CMQTTCONNECT: 0,0"); 
    return (connRes.indexOf("+CMQTTCONNECT: 0,0") != -1);
}

// MQTT send
bool CommHandler::publishMQTT(String topic, String payload) {
    // 1. Set Topic
    String topicCmd = "AT+CMQTTTOPIC=0," + String(topic.length());
    _serialAT->println(topicCmd);
    delay(100); // Modem akan membalas dengan '>' minta input
    if (sendATCommand(topic, 2000, "OK") == "") return false;

    // 2. Set Payload
    String payloadCmd = "AT+CMQTTPAYLOAD=0," + String(payload.length());
    _serialAT->println(payloadCmd);
    delay(100); // Modem akan membalas dengan '>' minta input
    if (sendATCommand(payload, 2000, "OK") == "") return false;

    // 3. Publish (QoS 1, Timeout 60 detik)
    // +CMQTTPUB: 0,0 menandakan publish berhasil
    String pubRes = sendATCommand("AT+CMQTTPUB=0,1,60", 10000, "+CMQTTPUB: 0,0");
    return (pubRes.indexOf("+CMQTTPUB: 0,0") != -1);
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