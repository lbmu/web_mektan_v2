# DESKRIPSI PROYEK

Repositori ini merupakan sistem IoT buat monitoring lokasi dan tegangan aki alsintan. Secara garis besar, arsitektur sistem dibagi dalam bentuk folder `esp`, `frontend`, dan `backend`  yang disesuaikan dengan lapisan umum IoT.
* `esp` untuk menampung sensing/perception dan network layer (basically hardware/network level), dengan file [prima donna](/esp/src/main.cpp) `main.cpp`
* `backend` untuk menampung network/service layer (basically penghubung antara hardware dengan jaringan), dengan file MC (siapa?)
* `frontend` untuk menampung application layer (basically lapisan yang user friendly untuk menampilkan data agar enak untuk dilihat)

Repo ini juga didukung oleh dokumentasi dan catatan yang disimpan di dalam folder `docs` dan `logs` respectively. Format dokumentasi menggunakan MarkDown GitHub sama dengan [README](/README.md) ini.
* `docs` adalah kumpulan dokumentasi proyek
* `logs` adalah catatan selama proyek dikembangkan

Skill umum yang harus dimiliki oleh pengembang proyek adalah:
* niat lulus
* MarkDown writing
* prompting *jarvis*
* Navigasi teks
    * Ctrl + Arrow
    * Home
    * End
    * Ctrl + Home
    * Ctrl + End
* Blocking teks
    * Ctrl + Shift + Arrow
    * Shift + Home
    * Shift + End
    * Ctrl + L
    * Ctrl + Shift + Home
    * Ctrl + Shift + End
* Manipulasi teks
    * Alt + Arrow
    * Tab
    * Shift + Tab
* Gercep
    * Super + D, Alt + F4, Enter
    * Alt + Tab
    * Alt + Shift + Tab
    * Ctrl + Alt + T
* Ngetik 10 jari (opsional)

Skill khusus yang harus dimiliki oleh pengembang esp adalah:
* C++
* FreeRTOS
* 

Untuk menggunakan proyek ini, bisa di clone menggunakan command 
```
git clone https://github.com/lbmu/web_mektan_v2.git
```
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
> Untuk **Shell**, gunakan command di bawah ini dalam terminal ~~caheum~~.
```bash
# Biar mode execution
chmod +x git_sync.sh
# eksekusi kode nya
sh git_sync.sh
```
Jika skrip nya bermasalah, cari tahu sendiri biar sekalian belajar :stuck_out_tongue_closed_eyes:

## DOKUMENTASI DAN PANDUAN

Karena di [README](/README.md) ini udah pernah nyampe 500 baris dalam format `.md`, semua dokumentasi sistem dipindahkan ke folder [`docs`](/docs/). Dokumentasi dipisah sesuai masing-masing layer sistem.

# FOR USERS

_Coming soon..._
