# FOR DEVELOPERS

## The Lord of The Rings: The Two Towers

**Mr. Frodo**
> I can’t do this, Sam.

**Sam**
> I know. It’s all wrong. By rights we shouldn’t even be here. But we are. 
> It’s like in the great stories, Mr. Frodo. The ones that really mattered. Full of darkness and danger, they were. And sometimes you didn’t want to know the end. Because how could the end be happy? How could the world go back to the way it was when so much bad had happened? 
> But in the end, it’s only a passing thing, this shadow. Even darkness must pass. A new day will come. And when the sun shines it will shine out the clearer. Those were the stories that stayed with you. That meant something, even if you were too small to understand why.
> But I think, Mr. Frodo, I do understand. I know now. Folk in those stories had lots of chances of turning back, only they didn’t. They kept going. Because they were holding on to something.

**Mr. Frodo**
> What are we holding onto, Sam?

**Sam**
> Biar cepet lulus dul

## VERSION CONTROL

untuk sekarang, upload kode ke repo remote bisa menggunakan script yang sudah dibuat. Script yang digunakan adalah `git_sync.bat` untuk :window: atau `git_sync.sh` untuk :shell:.
> [!NOTE]
> Untuk **Windows**, jalankan `git_sync.bat` dengan privilege admin (mereun)
> Untuk **Shell**, gunakan command di bawah ini.
```bash
# Biar mode execution
chmod +x git_sync.sh
# eksekusi kode nya
sh git_sync.sh
```
Jika skrip nya bermasalah, cari tahu sendiri biar sekalian belajar :stuck_out_tongue_closed_eyes:
## PERCEPTION

Panduan pada sensing/perception layer, basically mikro dan baca sensor
> [!NOTE]
> Di sini, arsitektur yang dipakai adalah FreeRTOS dengan bahasa C++.

### Mikro ESP32
esp32 DevKitC V4 adalah mikro yang kaya esp32 DevKitC V4 :electric_plug::computer:

#### Pinout
Pinout sistem terdapat di dalam header file `include/pinout.h`.

[di sini nanti bakal ada gambar skematik]

ESP32 mendukung GPIO Matrix, dimana GPIO nya fleksibel bisa di-set sebagai periferal yang diinginkan. Baca panduannya [di sini](https://randomnerdtutorials.com/esp32-pinout-reference-gpios/).

#### Library

Library yang digunakan adalah:
* TinyGPSPlus (GPS)
* Adafruit INA219 (Sensor daya)

File library dapat ditemukan di dalam environment konfigurasi PlatformIO. Defaultnya adalah `.pio/libdeps/rymcu-esp32-devkitc`. Konfigurasi library bisa dilakukan di dalam file `platformio.ini` bagian `lib_deps`. Explore library yang didukung oleh PlatformIO di PIO Home (Yang logo  alien), dan detail library nya [di sini](https://registry.platformio.org/search?t=library).

#### Upload Kode
Konfigurasi berada di dalam file `platformio.ini`
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
#define MQTT_USER "NAMA_U$ER"
#define MQTT_PASS "P4SSW0RD"butuh password
```

#### Debugging
Debugging dilakukan untuk menganalisis perilaku sistem (mainly kalo banyak error)

##### Normal Task
Aktifkan mode Tes
```cpp
// cek notip (komentar untuk disable) [shortcut di VS Code: Ctrl + /]
#define RUN_TEST // <- Buat run task biasa
// #define RUN_DIAGNOSTICS // <-- Buat DIAGNOSIS SISTEM
```
Sistem akan mengeksekusi baris program yang diawali oleh `#ifdef RUN_TEST` dan diakhiri oleh `#endif`

##### Diagnostics
Aktifkan Mode Diagnosis
```cpp
// cek notip (komentar untuk disable) [shortcut di VS Code: Ctrl + /]
// #define RUN_TEST // <- Buat run task biasa
#define RUN_DIAGNOSTICS // <-- Buat DIAGNOSIS SISTEM
```
Sistem akan mengeksekusi baris program yang diawali oleh `#ifdef RUN_DIAGNOSTICS` dan diakhiri oleh `#endif`

### u-Blox NEO M8N

Komponen ini berkomunikasi dengan mikro menggunakan periferal **UART**

Modul GPS menggunakan library TinyGPSPlus, seperti yang sudah didefinisikan pada bagian [mikrokontroler ESP32](#library). File yang relevan untuk modul GPS adalah:
* `include/GpsHandler.h` (header file yang memanggil library, mendefinisikan kelas dan fungsi, serta klasifikasi private/publik)
* `src/GpsHandler.cpp` (kumpulan logika modul)
* `src/main.cpp` (alur logika modul yang berjalan di esp32)

> [!IMPORTANT]
> Modul GPS harus di bawa keluar, karena kalau diuji coba di lab, letak koordinatnya gak akan muncul.

### INA219

Komponen ini berkomunikasi dengan mikro menggunakan periferal **I2C**

Modul INA219 menggunakan library INA219, seperti yang sudah didefinisikan pada bagian [mikrokontroler ESP32](#library). File yang relevan untuk INA219 adalah:
* `include/PowerMonitor.h` (header file mendefinisikan kelas dan fungsi, serta klasifikasi private/publik. Header file ini yang akan memanggil library)
* `src/PowerMonitor.cpp` (kumpulan logika modul)
* `src/main.cpp` (alur logika modul yang berjalan di esp32)


### SIM7600G

Komponen ini berkomunikasi dengan mikro menggunakan periferal **UART**

> [!IMPORTANT]
> Pastikan sistem pindah ke mode `TEST_SIM_PASSTHROUGH` terlebih dahulu, agar AT Command bisa diinput manual melalui terminal
```cpp
// cek notip (komentar untuk disable) [shortcut di VS Code: Ctrl + /]
// #define RUN_TEST // <- Buat run task biasa
#define RUN_DIAGNOSTICS // <-- Buat DIAGNOSIS SISTEM
// ~
// ~
// ~
#ifdef RUN_DIAGNOSTICS
// diagnostics.run(TEST_LAB_PASSTHROUGH);
diagnostics.run(TEST_SIM_PASSTHROUGH);
#endif
```

#### Konektivitas/Status Modul

1. Cek modul
```bash
AT
```

2. Cek suplai power
```bash
AT+CBC
```
#### SIM Card

Usahakan pakai sim card jangkauan sinyal nya luas (terutama di daerah sawah)

##### Status SIM

1. Cek Status
```bash
AT+CPIN?
```

2. Cek Seri
```bash
AT+CCID
```

## NETWORK
Dokumentasi pada layer jaringan, basically AT Command dan API

### SIM7600G

Modul Komunikasi SIM7600G menggunakan AT Command untuk berkomunikasi. Dokumentasi tentang AT Command bisa dilihat [di sini](https://simcom.ee/documents/SIM7600C/SIM7500_SIM7600%20Series_AT%20Command%20Manual_V1.01.pdf)

> [!IMPORTANT]
> Pastikan sistem pindah ke mode `TEST_SIM_PASSTHROUGH` terlebih dahulu, agar AT Command bisa diinput manual melalui terminal
#### Cek Kuota

1. Aktifkan Mode GSM
```bash
AT+CSCS="GSM"
```

2. Dial number operator
```bash
AT+CUSD=1,"*888#"
```

3. Dengarkan notifnya (balikin ke LTE)
```bash
AT+CNMP=38
```

#### Sinyal
1. Kekuatan Sinyal
```bash
AT+CSQ
```

2. Jaringan
```bash
AT+CEREG?
```

3. Detail Jaringan
```bash
AT+CPSI?
```

#### Set-Up Jaringan
1. Pastikan modul menggunakan mode 4G.
```
AT+CNMP=2
```
atau
```
AT+CNMP=38
```

2. Verifikasi mode
```
AT+CPSI?
```

3. Set Profil
```
AT+CGDCONT=1,"IP","internet"
```
> [!NOTE]
> argumen `internet` bisa berubah-ubah tergantung provider

4. Aktifkan PDP Context untuk terhubung ke internet
```
AT+CGACT=1,1
```

5. Verifikasi IP Address
```
AT+CGPADDR=1
```
#### Koneksi Internet (HTTP/GET)
1. Inisialisasi HTTP
```
AT+HTTPINIT
```
2. Set URL Dummy
```
AT+HTTPPARA="URL","http://httpbin.org/get"
```
> [!NOTE]
> URL `http://httpbin.org/get` bebas dipilih selama pake metode GET

3. Eksekusi
```
AT+HTTPACTION=0
```
Tunggu balasan setelah OK. Contoh balasan adalah `+HTTPACTION: 0,200,254`, dimana:
* `0` adalah metode yang dipilih (GET)
* `200` adalah kode status HTTP
* `254` adalah ukuran dalam byte

4. Membaca balasan dari server
```
AT+HTTPREAD=0,500
```
Kalo ada ada text format `json` berarti udah aman

5. Tutup Sesi HTTP
```
AT+HTTPTERM
```

#### Koneksi Internet (MQTT/Publish)

1. Mulai MQTT Service
```
AT+CMQTTSTART
```
Tunggu respon `CMQTTSTART: 0`

2. Daftarkan Client ID ke sistem
```
AT+CMQTTACCQ=0,"<apa_lah_bebas>"
```

3. Hubungkan ke Broker HiveMQ
```
AT+CMQTTCONNECT=0,"tcp://broker.hivemq.com:1883",60,1
```
> [!IMPORTANT]
> Jika broker HiveMQ Anda membutuhkan username dan password, gunakan format: `AT+CMQTTCONNECT=0,"tcp://broker.hivemq.com:1883",60,1,"username_anda","password_anda"`
> Tunggu hingga modul merespons `+CMQTTCONNECT: 0,0` yang menandakan koneksi berhasil.

4. Set Topik MQTT (Misalnya kita ingin mengirim ke topik `alsintan/test` [panjang karakter = 13])
```
AT+CMQTTTOPIC=0,13
```
Setelah command dikirim, terminal akan memunculkan simbol `>`. Lalu, ketikkan nama topiknya :
```
alsintan/test
```

5. Set Payload (Data JSON). Misalnya kita ingin mengirim data `{"power":120}` (panjang karakter = 13)
```
AT+CMQTTPAYLOAD=0,13
```
Setelah command dikirim, terminal akan memunculkan simbol `>`. Ketikkan payloadnya :
```
{"power":120}
```

6. Publish (Kirim data)

Kirim data dengan QoS 1 dan timeout 60 detik.
```
AT+CMQTTPUB=0,1,60
```
Tunggu hingga merespons `+CMQTTPUB: 0,0` yang berarti data sukses terkirim ke broker.

7. Putus koneksi dan tutup layanan

Bersihkan session MQTT agar modul tidak menggantung.
```
AT+CMQTTDISC=0,60
AT+CMQTTREL=0
AT+CMQTTSTOP
```

## APPLICATION

# FOR USERS

_Coming soon..._
