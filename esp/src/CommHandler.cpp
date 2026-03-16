#include "CommHandler.h"

CommHandler::CommHandler(int rxPin, int txPin, long baudRate, int serialPort) 
    : _rxPin(rxPin), _txPin(txPin), _baudRate(baudRate) {
    _serialAT = new HardwareSerial(serialPort);
    
    // 1. Init Modem
    _modem = new TinyGsm(*_serialAT);
    
    // 2. Klien TCP murni
    _baseClient = new TinyGsmClient(*_modem);
    
    // 3. Mesin SSL/TLS (Dihitung oleh prosesor ESP32)
    _secureClient = new ESP_SSLClient();
    _secureClient->setClient(_baseClient);
    _secureClient->setInsecure(); // Bypass verifikasi sertifikat agar lolos ke HiveMQ
    
    // 4. Klien MQTT
    _mqtt = new PubSubClient(*_secureClient);
}

bool CommHandler::begin() {
    _serialAT->begin(_baudRate, SERIAL_8N1, _rxPin, _txPin);

    pinMode(_rxPin, INPUT_PULLUP);
    delay(3000);
    
    Serial.println("Modem: Restarting...");
    if (!_modem->restart()) { 
        return false;
    }
    
    Serial.print("Modem Info: ");
    Serial.println(_modem->getModemInfo());
    
    return configureNetwork();
}

bool CommHandler::configureNetwork() {
    Serial.print("Modem: Menunggu Sinyal 4G...");
    if (!_modem->waitForNetwork(10000L)) {
        Serial.println(" Gagal/Timeout!");
        return false;
    }
    Serial.println(" SIAP!");

    // Sesuaikan APN jika kartu operator Anda mewajibkan, default "internet" biasanya aman
    Serial.print("Modem: Menghubungkan ke Internet...");
    if (!_modem->gprsConnect("internet", "", "")) {
        Serial.println(" Gagal!");
        return false;
    }
    Serial.println(" OK!");
    return true;
}

bool CommHandler::connectMQTT(String broker, int port, String clientId, String user, String pass) {
    _mqtt->setServer(broker.c_str(), port);
    _mqtt->setSocketTimeout(10); 

    Serial.print("MQTT: Jabat Tangan TLS ke "); 
    Serial.print(broker); 
    Serial.print("...");

    bool status;
    if (user == "" && pass == "") {
        status = _mqtt->connect(clientId.c_str());
    } else {
        status = _mqtt->connect(clientId.c_str(), user.c_str(), pass.c_str());
    }

    if (status) {
        return true;
    } else {
        Serial.print(" [GAGAL] Kode Error (rc): ");
        Serial.println(_mqtt->state());
        return false;
    }
}

bool CommHandler::publishMQTT(String topic, String payload) {
    if (_mqtt->connected()) {
        return _mqtt->publish(topic.c_str(), payload.c_str());
    }
    return false;
}

void CommHandler::loop() {
    if (_mqtt->connected()) {
        _mqtt->loop();
    }
}

void CommHandler::serialPassthrough() {
    while (Serial.available()) {
        _serialAT->write(Serial.read());
    }
    while (_serialAT->available()) {
        Serial.write(_serialAT->read());
    }
}