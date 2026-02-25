# Deskripsi Umum

# Detail Implementasi

paragraf pengantar *lorem ipsum*

## Lingkungan Pengembangan

Jelasin pake software dan tools apa aja yang digunakan untuk mengembangkan proyek, kaya VSCode, EasyEDA, dsb.

## Hardware

Jelasin Hardware berperan sebagai apa dalam keseluruhan sistem.

### Komponen

Paragraf pengantar *lorem ipsum*

* Modul Mikrokontroler ESP32
* Modul Komunikasi Seluler SIM7600G
* Modul GPS u-Blox NEO M8N
* Modul Sensor Tegangan/Aki INA219
* Modul Regulasi Listrik
* Modul Pendukung lainnya

### Desain

* Desain PCB
* Desain Casing

### Skematik

Gambar skematik sistem

### Implementasi

paragraf pengantar *lorem ipsum*

> [!NOTE]
> source code nya masih pake header, yang cpp nanti di alur kerja sistem

#### Mikro
* Spesifikasi
* GPIO Matrix
* OTA brief
* Source Code 

#### KomSel
* Spesifikasi
* Pinout
* Source Code

#### GPS
* Spesifikasi
* Pinout
* Source Code

#### Sensor Tegangan
* Spesifikasi
* Pinout
* Source Code

#### Regulasi Listrik
apa lah jelasin

#### Modul lain
apa lah jelasin

## Software

paragraf pengantar *lorem ipsum*

### Framework

framework teh apa? (serius nanya)
* Arduino

### Library

* mikalhart/TinyGPSPlus@^1.1.0
* adafruit/Adafruit INA219@^1.2.3

### FreeRTOS

Perbedaan superloop dan FreeRTOS
Pemilihan arsitektur FreeRTOS pada sistem ini didasarkan pada kebutuhan akan keandalan dan responsivitas tinggi yang menjadi karakteristik perangkat IoT modern. Berbeda dengan arsitektur Superloop yang menjalankan tugas secara sekuensial dan berisiko mengalami delay signifikan pada sistem yang kompleks, RTOS memungkinkan pembagian tugas secara independen dengan prioritas yang jelas. Hal ini memastikan bahwa pengambilan data sensor dan koordinat GPS tetap berjalan akurat meskipun sistem sedang melakukan proses pengiriman data yang memiliki latensi jaringan.
Tekankan terutama di `delay(x);` dan `vTaskDelay(x / portTICK_PERIOD_MS);`

### OTA

OTA biar gak usah tiduran, kotor-kotoran bongkar pasang traktor

## Alur Kerja Sistem

The Delusion of something something

### Perception Layer

* RTOS
* UART
* I2C

### Network Layer

1. AT Command
2. HTTP

### Service/Application Layer

tampilan data yang diterima oleh backend(?)

# Prosedur Pengoperasian

kalimat pengantar *lorem ipsum*
> Ini mah dari README GitHub aja lah