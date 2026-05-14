#include "DataHandler.h"

DataHandler::DataHandler() {}
DataManager::DataManager() {
    _dataMutex = xSemaphoreCreateMutex();
}

bool DataHandler::begin() {
    if (!LittleFS.begin(true)) {
        Serial.println("❌ Gagal Mount LittleFS!");
        return false;
    }
    Serial.println("✅ LittleFS Mounted!");
    return true;
}

bool DataHandler::saveData(const bufferedData& data) {
    File file = LittleFS.open(_filename, FILE_APPEND);
    if (!file) {
        Serial.println("❌ Gagal buka file untuk ditulis!");
        return false;
    }

    file.write((uint8_t*)&data, sizeof(bufferedData));
    file.close();

    return true;
}

bool DataHandler::hasData() {
    return LittleFS.exists(_filename);
}

File DataHandler::openForRead() {
    return LittleFS.open(_filename, FILE_READ);
}

void DataHandler::clearData() {
    if (LittleFS.exists(_filename)) LittleFS.remove(_filename);
}

String DataHandler::buildJson(const bufferedData& data, const String& deviceID) {
    JsonDocument doc;
    doc["id"] = deviceID;
    
    if (isnan(data.lat)) doc["lat"] = nullptr; 
    else doc["lat"] = serialized(String(data.lat, 6));
    
    if (isnan(data.lng)) doc["lng"] = nullptr; 
    else doc["lng"] = serialized(String(data.lng, 6));
    
    if (isnan(data.voltage_V)) doc["V"] = nullptr; 
    else doc["V"] = serialized(String(data.voltage_V, 2));
    
    if (isnan(data.current_mA)) doc["I"] = nullptr; 
    else doc["I"] = serialized(String(data.current_mA, 2));
    
    if (isnan(data.fuel_R)) doc["bbm"] = nullptr; 
    else doc["bbm"] = serialized(String(data.fuel_R, 2));
    
    if (isnan(data.hdop)) doc["hd"] = nullptr; 
    else doc["hd"] = data.hdop;
    
    doc["ts"] = data.timestamp;

    String output;
    serializeJson(doc, output);
    return output;
}

bool DataManager::begin() {
    return (_dataMutex != NULL);
}

void DataManager::updateGPS(double lat, double lng, double hdop, int sat) {
    if (xSemaphoreTake(_dataMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
        _internalData.lat = lat;
        _internalData.lng = lng;
        _internalData.hdop = hdop;
        _internalData.sat = sat;
        _internalData.gpsUpdated = true;
        xSemaphoreGive(_dataMutex);
    }
}

void DataManager::updatePower(float voltage, float current, float power, float fuel) {
    if (xSemaphoreTake(_dataMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
        _internalData.voltage_V = voltage;
        _internalData.current_mA = current;
        _internalData.power_mW = power;
        _internalData.fuel_R = fuel;
        xSemaphoreGive(_dataMutex);
    }
}

bufferedData DataManager::getPackage() {
    bufferedData pkg;
    if (xSemaphoreTake(_dataMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
        pkg.lat = _internalData.lat;
        pkg.lng = _internalData.lng;
        pkg.hdop = (int)_internalData.hdop;
        pkg.sat = _internalData.sat;
        pkg.voltage_V = _internalData.voltage_V;
        pkg.current_mA = _internalData.current_mA;
        pkg.fuel_R = _internalData.fuel_R;
        // Timestamp diambil saat fungsi ini dipanggil di TaskTelemetry
        xSemaphoreGive(_dataMutex);
    }
    return pkg;
}

SharedData DataManager::getData() {
    SharedData temp;
    if (xSemaphoreTake(_dataMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
        temp = _internalData;
        xSemaphoreGive(_dataMutex);
    }
    return temp;
}