#ifndef GPS_HANDLER_H
#define GPS_HANDLER_H

#include <Arduino.h>
#include <TinyGPS++.h>

class GpsHandler {
public:
    // Constructor menerima pin RX dan TX
    GpsHandler(int rxPin, int txPin);
    
    // Inisialisasi serial GPS
    void begin(unsigned long baud);
    
    // Fungsi untuk memproses data serial (dipanggil di loop/task)
    // Mengembalikan true jika ada data baru yang berhasil di-encode
    bool update();
    
    // Cek apakah lokasi valid
    bool isValid();
    
    // Getter data
    double getLat();
    double getLng();

private:
    int _rxPin;
    int _txPin;
    HardwareSerial* _serial; // Pointer ke HardwareSerial
    TinyGPSPlus _gps;
};

#endif