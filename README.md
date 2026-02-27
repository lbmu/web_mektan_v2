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

untuk sekarang, upload kode ke repo remote bisa menggunakan script yang sudah dibuat. Script yang digunakan adalah `git_sync.bat` untuk **Windows** atau `git_sync.sh` untuk **Shell**.
> [!NOTE]
> Untuk Windows, jalankan `git_sync.bat` dengan privilege admin (mereun)
> Untuk shell, gunakan command di bawah ini terlebih dahulu.
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



#### Pinout
Pinout sistem terdapat di dalam header file `include/pinout.h`.
ESP32 mendukung GPIO Matrix, dimana GPIO nya fleksibel bisa di-set sebagai periferal yang diinginkan. Baca panduannya [di sini](https://randomnerdtutorials.com/esp32-pinout-reference-gpios/).

#### Upload Kode
Kode berada di dalam `platformio.ini`
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

#define WIFI_SSID "nama ssid"
#define WIFI_PASS "P4$$word" // <-- Usahakan lower/UPPERcase, s!mbo|, dan 4ngk4>
#define OTA_PASS  "####" // <-- samain sama --auth pada platformio.ini>
```

#### Debugging
Debugging dilakukan untuk menganalisis perilaku sistem (mainly kalo banyak error)
##### Normal Task
Pastikan mode task sudah menyala
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

### SIM7600G

> [!IMPORTANT]
> Pastikan sistem pindah ke mode `TEST_SIM_PASSTHROUGH` terlebih dahulu

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
> [!IMPORTANT]
> Pastikan sistem pindah ke mode `TEST_SIM_PASSTHROUGH` terlebih dahulu
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
#### Koneksi Internet
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

## APPLICATION

# FOR USERS

_Coming soon.._
