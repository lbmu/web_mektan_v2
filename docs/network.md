> [!NOTE]
> Dokumentasi pada layer jaringan, basically AT Command dan API
> 

# SIM7600G

Modul Komunikasi SIM7600G menggunakan AT Command untuk berkomunikasi. Dokumentasi tentang AT Command bisa dilihat [di sini](https://simcom.ee/documents/SIM7600C/SIM7500_SIM7600%20Series_AT%20Command%20Manual_V1.01.pdf)

> [!IMPORTANT]
> Pastikan sistem pindah ke mode diagnostics terlebih dahulu, agar AT Command bisa di-input manual melalui terminal. Cek [dokumentasi perception](/docs/perception.md) bagian *debugging* untuk info lebih lanjut.
> Setelah masuk mode diagnostics, masuk ke mode `TEST_SIM_PASSTHROUGH`
```cpp
#ifdef RUN_DIAGNOSTICS
// diagnostics.run(TEST_LAB_PASSTHROUGH); // Yang ini buat tes GPS dalem ruangan (Cek modul doang, belum bisa ngirim koordinat)
diagnostics.run(TEST_SIM_PASSTHROUGH); // Yang ini buat ngirimin AT Command
#endif
```
## Cek Kuota

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

## Sinyal
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

## Set-Up Jaringan
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
## Koneksi Internet (HTTP/GET)
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

## Koneksi Internet (MQTT/Publish)

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

# MQTT

yolo