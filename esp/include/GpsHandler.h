#pragma once

#include <Arduino.h>
#include <TinyGPS++.h>

class GpsHandler {
public:
    // Constructor menerima pin RX dan TX
    GpsHandler(int rxPin, int txPin, int serialPort);
    
    // Inisialisasi serial GPS
    bool begin(unsigned long baud);
    
    // Fungsi untuk memproses data serial (dipanggil di loop/task)
    // Mengembalikan true jika ada data baru yang berhasil di-encode
    bool update();
    
    // Cek apakah lokasi valid
    bool isValid();
    uint32_t getAge();
    
    // Getter data
    double getLat();
    double getLng();
    void echoRawData();
    unsigned long getUnixTime();

private:
    int _rxPin;
    int _txPin;
    HardwareSerial* _serial;
    TinyGPSPlus _gps;

    double _filteredLat = 0.0;
    double _filteredLng = 0.0;

    const double DISTANCE_THRESHOLD = 2.5;
};