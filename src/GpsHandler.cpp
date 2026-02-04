#include "GpsHandler.h"


GpsHandler::GpsHandler(int rxPin, int txPin) : _rxPin(rxPin), _txPin(txPin) {
    _serial = new HardwareSerial(2); // Gunakan UART2 untuk GPS
}

void GpsHandler::begin(unsigned long baud) {
    _serial->begin(baud, SERIAL_8N1, _rxPin, _txPin);
}

void GpsHandler::echoRawData() {
    while (_serial->available()) {
        char c = _serial->read();
        Serial.write(c); // Kirim langsung ke monitor (Passthrough)
    }
}

bool GpsHandler::update() {
    bool newData = false;
    while (_serial->available() > 0) {
        if (_gps.encode(_serial->read())) {
            newData = true;
        }
    }
    return newData;
}

bool GpsHandler::isValid() {
    return _gps.location.isValid();
}

double GpsHandler::getLat() {
    return _gps.location.lat();
}

double GpsHandler::getLng() {
    return _gps.location.lng();
}