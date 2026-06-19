#include "CommHandler.h"
#include "espOTA.h"

#include <time.h>

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
    
    DEBUG_PRINTLN("[MODEM] Cek Status(Init)...");
    if (!_modem->init()) { 
        DEBUG_PRINTLN("[MODEM] No responses. Restarting...");
        if (!_modem->restart())
            return false;
    }
    
    DEBUG_PRINT("Modem Info: ");
    DEBUG_PRINTLN(_modem->getModemInfo());
    
    return configureNetwork();
}

bool CommHandler::configureNetwork() {
    DEBUG_PRINT("Modem: Menunggu Sinyal 4G...");
    if (!_modem->waitForNetwork(60000L)) {
        DEBUG_PRINTLN(" Gagal/Timeout!");
        return false;
    }
    DEBUG_PRINTLN(" SIAP!");

    // Sesuaikan APN jika kartu operator Anda mewajibkan, default "internet" biasanya aman
    DEBUG_PRINT("Modem: Menghubungkan ke Internet...");
    if (!_modem->gprsConnect("internet", "", "")) {
        DEBUG_PRINTLN(" Gagal!");
        return false;
    }
    DEBUG_PRINTLN(" OK!");
    return true;
}

void CommHandler::configMQTT(String broker, int port, String clientId, String user, String pass) {
    _broker = broker;
    _port = port;
    _clientID = clientId;
    _user = user;
    _pass = pass;
}

bool CommHandler::publishMQTT(String topic, String payload) {
    if (_mqtt->connected()) {
        return _mqtt->publish(topic.c_str(), payload.c_str());
    }
    return false;
}

bool CommHandler::maintainConnection() {
    if (!_lteConnected) {
        DEBUG_PRINTLN("\n📡 Modem belum siap. Mencoba inisialisasi...");
        if (begin()) {
            _lteConnected = true;
            _mqttFailCount = 0;
        }
        else {
            DEBUG_PRINTLN("❌ Gagal Connect 4G. Coba lagi nanti...");
            return false;
        }
    }
    
    if (_lteConnected && !_mqtt->connected()) {
        DEBUG_PRINTLN("📡 Menghubungkan ke Broker HiveMQ...");
        _mqtt->setServer(_broker.c_str(), _port);
        _mqtt->setSocketTimeout(10);

        bool status = (_user == "" && _pass == "") ?
            _mqtt->connect(_clientID.c_str()) :
            _mqtt->connect(_clientID.c_str(), _user.c_str(), _pass.c_str());
        if (status) {
            DEBUG_PRINTLN("✅ Terhubung ke Broker! Siap publish data.");
            _mqttFailCount = 0;
        }
        else {
            _mqttFailCount++;
            DEBUG_PRINTF("⚠️ Gagal Connect MQTT (Percobaan %d/15)\n", _mqttFailCount);
            if (_mqttFailCount >= 15) {
                DEBUG_PRINTLN("🔄 Internet/Sinyal putus! Me-reset Modem 4G...");
                _lteConnected = false;
            }
            return false;
        }
    }
    if (_mqtt->connected()) {
        _mqtt->loop();
        return true;
    }
    return false;
}

extern String telnetPendingCmd;

void CommHandler::serialPassthrough() {
    while (Serial.available()) {
        _serialAT->write(Serial.read());
    }

    #ifdef USE_TELNET_DEBUG
    if (telnetPendingCmd.length() > 0) {
        _serialAT->print(telnetPendingCmd);
    }
    #endif

    String modemResponse = "";
    while (_serialAT->available()) {
        char c = _serialAT->read();
        Serial.write(c);
        #ifdef USE_TELNET_DEBUG
        modemResponse += c;
        #endif
    }
    #ifdef USE_TELNET_DEBUG
    if (modemResponse.length() > 0 && telnet.isConnected())
        telnet.print(modemResponse);
    #endif
}

/*  @brief
 *  GPS Handler
 *  blok nya rusak jir
 */

bool CommHandler::enableGNSS() {
    DEBUG_PRINT("+");
    return _modem->enableGPS();
}

bool CommHandler::disableGNSS() {
    DEBUG_PRINT("-");
    return _modem->disableGPS();
}

bool CommHandler::getGNSSData(float *lat, float *lng, float *speed, float *alt, int *vsat, int *usat, float *accuracy) {
    return _modem->getGPS(lat, lng, speed, alt, vsat, usat, accuracy);
}

unsigned long CommHandler::getNetworkTimestamp() {
    int year =0,
        month = 0,
        day = 0,
        hour = 0,
        min = 0,
        sec = 0;
    float timezone = 0;

    if (_modem->getNetworkTime(&year, &month, &day, &hour, &min, &sec, &timezone)) {
        
        // Ini output raw
        // DEBUG_PRINT("🕒 [SIM7600] Raw Network Time: ");
        // DEBUG_PRINT(year); DEBUG_PRINT("/");
        // DEBUG_PRINT(month); DEBUG_PRINT("/");
        // DEBUG_PRINT(day); DEBUG_PRINT(" ");
        // DEBUG_PRINT(hour); DEBUG_PRINT(":");
        // DEBUG_PRINT(min); DEBUG_PRINT(":");
        // DEBUG_PRINTLN(sec);

        // Ini udah keproses
        struct tm t = {0};
        t.tm_year = (year > 2000) ? (year - 1900) : (year + 100); // Format C++ (Tahun sejak 1900)
        t.tm_mon  = month - 1;  // Format C++ (Bulan 0 - 11)
        t.tm_mday = day;
        t.tm_hour = hour;
        t.tm_min  = min;
        t.tm_sec  = sec;

        unsigned long epoch = mktime(&t);
        return epoch;
    }
    return 0;
}

float CommHandler::getTemp() {
    return _modem->getTemperature();
}