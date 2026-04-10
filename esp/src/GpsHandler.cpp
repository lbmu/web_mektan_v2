#include "GpsHandler.h"
#include "espOTA.h"
#include  <time.h>

GpsHandler::GpsHandler(int rxPin, int txPin, int serialPort): _rxPin(rxPin), _txPin(txPin) {
    _serial = new HardwareSerial(serialPort);
}

bool GpsHandler::begin(unsigned long baud) {
    _serial->begin(baud, SERIAL_8N1, _rxPin, _txPin);

        unsigned long startWait = millis();
    while (millis() - startWait < 1500)
    {
        if (_serial->available() > 0) return true;
        delay(10);
    }
    return false;
}

bool GpsHandler::update() {
    bool newData = false;
    while (_serial->available() > 0) {
        if (_gps.encode(_serial->read())) {
            newData = true;
        }
    }

    if (newData && _gps.location.isValid() && _gps.location.isUpdated()) {
        double currentLat = _gps.location.lat();
        double currentLng = _gps.location.lng();

        if (_filteredLat == 0.0 && _filteredLng == 0.0) {
            _filteredLat = currentLat;
            _filteredLng = currentLng;
        }

        else {
            double distance = TinyGPSPlus::distanceBetween(
                _filteredLat, _filteredLng,
                currentLat, currentLng
            );
            
            // Serial.write("Distance: %.2f", distance);
            if (distance >= DISTANCE_THRESHOLD) {
                _filteredLat = currentLat;
                _filteredLng = currentLng;
            }
        }
    }

    return newData;
}

bool GpsHandler::isValid() {
    return _gps.location.isValid();
}

uint32_t GpsHandler::getAge() {
    return _gps.location.age();
}

double GpsHandler::getLat() {
    return _filteredLat;
}

double GpsHandler::getLng() {
    return _filteredLng;
}

void GpsHandler::echoRawData() {
    while (_serial->available()) {
        char c = _serial->read();
        DEBUG_WRITE(c); // Kirim langsung ke monitor (Passthrough)
    }
}

unsigned long GpsHandler::getUnixTime() {
    if (!_gps.date.isValid() || !_gps.time.isValid() || _gps.date.year() < 2000) return 0;
    struct tm t = {0};

    t.tm_year = _gps.date.year() - 1900;
    t.tm_mon = _gps.date.month() - 1;
    t.tm_mday = _gps.date.day();

    t.tm_hour = _gps.time.hour();
    t.tm_min = _gps.time.minute();
    t.tm_sec = _gps.time.second();

    return mktime(&t);
}