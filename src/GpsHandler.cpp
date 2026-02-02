#include "GpsHandler.h"

// Menggunakan Serial1 (HardwareSerial 1) sesuai kode lama Anda
GpsHandler::GpsHandler(int rxPin, int txPin) : _rxPin(rxPin), _txPin(txPin) {
    _serial = new HardwareSerial(1);
}

void GpsHandler::begin(unsigned long baud) {
    _serial->begin(baud, SERIAL_8N1, _rxPin, _txPin);
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