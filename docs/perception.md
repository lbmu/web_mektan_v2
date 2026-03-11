> [!NOTE]
> Dokumentasi sensing/perception layer, basically mikro dan baca sensor
> Di sini, arsitektur yang dipakai adalah FreeRTOS dengan bahasa C++ dengan framework Arduino. Lingkungan pengembangan menggunakan Ekstensi **PlatformIO** pada VS Code.
> Navigasi ke path [hardware](/esp/) untuk pengembangan.

# FreeRTOS

Tools buat perbandingan masih dicari. Pokoknya dia bisa multitasking dan jauh lebih efisien dibanding kode superloop pada umumnya.
```ino
#define something

void setup() {
    something.init();
}

void loop() {
    delay(999); // baris blocking ganggu
}
```

# Mikro ESP32

esp32 DevKitC V4 adalah mikro yang kaya esp32 DevKitC V4 :electric_plug::computer:

## Pinout

Pinout sistem terdapat di dalam [header file](/esp/include/pinout.h) `pinout.h`.

![Skematik PCB](/assets/skematik.svg)

## Periferal Pin

> [!IMPORTANT]
> ESP32 mendukung GPIO Matrix, dimana GPIO nya fleksibel bisa di-set sebagai periferal yang diinginkan. Baca panduannya [di sini](https://randomnerdtutorials.com/esp32-pinout-reference-gpios/).

* P16 dan P17 sebagai UART
* P32 dan P33 sebagai UART
* P21 dan P22 sebagai I2C

## Library

Library yang digunakan adalah:
* TinyGPSPlus (GPS)
* Adafruit INA219 (Sensor daya)

File library dapat ditemukan di dalam environment konfigurasi PlatformIO. Defaultnya adalah `.pio/libdeps/rymcu-esp32-devkitc` pada proyek PlatformIO. Konfigurasi library bisa dilakukan di dalam file `platformio.ini` bagian `lib_deps`. Explore library yang didukung oleh PlatformIO di PIO Home (Yang logo  alien), dan detail library nya [di sini](https://registry.platformio.org/search?t=library).

## Upload Kode

Konfigurasi berada di dalam [file](/esp/platformio.ini) `platformio.ini`.

1. Menggunakan kabel micro USB (default)
```ini
upload_protocol = esptool
```

2. Menggunakan Wi-Fi (hopefully, lapangan)
```ini
upload_protocol = espota
upload_port = 192.168.4.1   ; IP Address ESP32 (Mode AP)
upload_flags =
    --auth=####             ; <--- Masukkan Password OTA kamu disini
    --port=3232             ; Port default OTA
```
> [!IMPORTANT]
> Jika ingin mengubah konfigurasi OTA, disarankan menggunakan micro-USB terlebih dahulu.
Kredensial Wi-Fi pada `main.cpp` menggunakan header file `secrets.h`. Kode tidak ada di repo GitHub agar oknum tidak bisa upload kode sembarangan. Kode `secrets.h` dibuat di dalam folder `include` .

Template header `secrets.h`
```cpp
#pragma once

#define WIFI_SSID "nama_ssid"
#define WIFI_PASS "P4$$word" // <-- Usahakan lower/UPPERcase, s!mbo|, dan 4ngk4>
#define OTA_PASS  "####" // <-- samain sama --auth pada platformio.ini>

#define MQTT_BROKER "broker.hivemq.com" // <-- Sesuaikan jika pakai cluster private
#define MQTT_PORT 1883                  // <-- Gunakan 8883 jika pakai TLS/SSL
#define MQTT_CLIENT_ID "apa_lah"
#define MQTT_TOPIC "pastikan_unik_karena_bisa_diakses_orang_jika_pake_publik"
#define MQTT_USER "NAMA_U$ER"
#define MQTT_PASS "P4SSW0RD"
```

> [!CAUTION]
> Terminal menggunakan protokol Wi-Fi bisa agak tricky. Upload ulang kode jika terminal tidak menunjukkan output apa-apa.

## Debugging

Debugging dilakukan untuk menganalisis perilaku sistem (mainly kalo banyak error). Debugging dikonfigurasi di dalam file [program utama](/esp/src/main.cpp) `main.cpp`. Untuk saat ini, debugging cuman comment/uncomment baris kode.

### Normal Task
Aktifkan mode normal
```cpp
// cek notip (komentar untuk disable) [shortcut di VS Code: Ctrl + /]
#define RUN_TEST // <- Buat run task biasa
// #define RUN_DIAGNOSTICS // <-- Buat DIAGNOSIS SISTEM
```
Sistem akan mengeksekusi baris program yang diawali oleh `#ifdef RUN_TEST` dan diakhiri oleh `#endif`

### Diagnostics
Aktifkan Mode Diagnosis
```cpp
// cek notip (komentar untuk disable) [shortcut di VS Code: Ctrl + /]
// #define RUN_TEST // <- Buat run task biasa
#define RUN_DIAGNOSTICS // <-- Buat DIAGNOSIS SISTEM
```
Sistem akan mengeksekusi baris program yang diawali oleh `#ifdef RUN_DIAGNOSTICS` dan diakhiri oleh `#endif`

# u-Blox NEO M8N

Komponen ini berkomunikasi dengan mikro menggunakan periferal **UART**

Modul GPS menggunakan library TinyGPSPlus, seperti yang sudah didefinisikan pada bagian [mikrokontroler ESP32](#library). File yang relevan untuk modul GPS adalah:
* `esp/include/GpsHandler.h` (header file yang memanggil library, mendefinisikan kelas dan fungsi, serta klasifikasi private/publik)
* `esp/src/GpsHandler.cpp` (kumpulan logika modul)
* `esp/src/main.cpp` (alur logika modul yang berjalan di esp32)

> [!IMPORTANT]
> Modul GPS harus di bawa keluar, karena kalau diuji coba di lab, letak koordinatnya gak akan muncul.
> Namun, jika masih belum memungkinkan untuk dites di luar, bisa cek modulnya saja terlebih dahulu.

## Cek status modul
1. Pada file `main.cpp`, [masuk mode diagnostics](#diagnostics).
2. Pilih mode `TEST_LAB_PASSTHROUGH`
```cpp
#ifdef RUN_DIAGNOSTICS
diagnostics.run(TEST_LAB_PASSTHROUGH); // Yang ini buat tes GPS dalem ruangan (Cek modul doang, belum bisa ngirim koordinat)
// diagnostics.run(TEST_SIM_PASSTHROUGH); // Yang ini buat ngirimin AT Command
#endif
```

3. Cek output terminal. Jika keluar *mojibake*, berarti modul udah aman.
4. Kalau belum:
    * Cek kabel (RX TX jangan kebalik)
    * udah sih cuman itu

# INA219

Komponen ini berkomunikasi dengan mikro menggunakan periferal **I2C**

Modul INA219 menggunakan library INA219, seperti yang sudah didefinisikan pada bagian [mikrokontroler ESP32](#library). File yang relevan untuk INA219 adalah:
* `esp/include/PowerMonitor.h` (header file mendefinisikan kelas dan fungsi, serta klasifikasi private/publik. Header file ini yang akan memanggil library)
* `esp/src/PowerMonitor.cpp` (kumpulan logika modul)
* `esp/src/main.cpp` (alur logika modul yang berjalan di esp32)

# SIM7600G

Komponen ini berkomunikasi dengan mikro menggunakan periferal **UART**

> [!IMPORTANT]
> Pastikan sistem pindah ke mode diagnostics terlebih dahulu, agar AT Command bisa di-input manual melalui terminal. Cek [dokumentasi perception](/docs/perception.md) [bagian *debugging*](#debugging) untuk info lebih lanjut.
> Setelah masuk mode diagnostics, masuk ke mode `TEST_SIM_PASSTHROUGH`
```cpp
#ifdef RUN_DIAGNOSTICS
// diagnostics.run(TEST_LAB_PASSTHROUGH); // Yang ini buat tes GPS dalem ruangan (Cek modul doang, belum bisa ngirim koordinat)
diagnostics.run(TEST_SIM_PASSTHROUGH); // Yang ini buat ngirimin AT Command
#endif
```

## Konektivitas/Status Modul

1. Cek modul
```bash
AT
```

2. Cek suplai power
```bash
AT+CBC
```
## SIM Card

Usahakan pakai sim card jangkauan sinyal nya luas (terutama di daerah sawah)

### Status SIM
1. Cek Status
```bash
AT+CPIN?
```

2. Cek Seri
```bash
AT+CCID
```