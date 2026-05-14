#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>
#include <LittleFS.h>

struct bufferedData {
    double lat;
    double lng;
    int hdop;
    int sat;
    float current_mA;
    float voltage_V;
    float fuel_R;
    unsigned long timestamp;
};

struct SharedData {
    double lat;
    double lng;
    double hdop;
    int sat;
    float power_mW;
    float voltage_V;
    float current_mA;
    bool gpsUpdated;
    bool isM8NActive;
    float fuel_R;
};

class DataHandler {

public:
    DataHandler();
    
    bool begin();
    bool saveData(const  bufferedData& data);
    bool hasData();
    File openForRead();
    void clearData();
    
    String buildJson(const bufferedData& data, const String& deviceID);

private:
    const char* _filename = "/tel_log.bin";
};

class DataManager {

public:
    DataManager();

    bool begin();

    void updateGPS(double lat, double lng, double hdop, int sat);
    void updatePower(float voltage, float current, float power, float fuel);
    void setM8NStatus(bool active);

    bufferedData getPackage();
    SharedData getData();

private:
    SharedData _internalData;
    SemaphoreHandle_t _dataMutex;
};