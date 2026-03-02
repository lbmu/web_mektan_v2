const mqtt = require('mqtt');
const readline = require('readline');

// --- 1. KONFIGURASI ---
const CONFIG = {
    ID_ALAT: 2, 
    TOPIC: 'project-mektan/v1/data', 
    BROKER: 'mqtt://broker.hivemq.com'
};

// --- 2. DATASET JALUR (Dari Data Log Riil) ---
const pathData = [
    // PERJALANAN MAJU (Titik A ke Titik B)
    { lat: -6.972208, long: 107.629068, volt: 4.43, arus: 0.01 },
    { lat: -6.972209, long: 107.629123, volt: 4.48, arus: -0.39 },
    { lat: -6.972211, long: 107.629178, volt: 4.52, arus: 0.11 },
    { lat: -6.972212, long: 107.629233, volt: 4.59, arus: -0.25 },
    { lat: -6.972213, long: 107.629288, volt: 4.56, arus: -0.02 },
    { lat: -6.972215, long: 107.629343, volt: 4.60, arus: -0.21 },
    { lat: -6.972216, long: 107.629397, volt: 4.33, arus: -0.12 },
    { lat: -6.972217, long: 107.629452, volt: 4.51, arus: 0.00 },
    { lat: -6.972219, long: 107.629507, volt: 4.49, arus: 0.22 },
    { lat: -6.972220, long: 107.629562, volt: 4.57, arus: 0.03 },
    { lat: -6.972221, long: 107.629617, volt: 4.33, arus: -0.02 },
    { lat: -6.972223, long: 107.629672, volt: 4.57, arus: 0.24 },
    { lat: -6.972224, long: 107.629727, volt: 4.31, arus: -0.31 },
    { lat: -6.972226, long: 107.629782, volt: 4.58, arus: -0.18 },
    { lat: -6.972227, long: 107.629837, volt: 4.34, arus: 0.24 },
    { lat: -6.972228, long: 107.629891, volt: 4.44, arus: -0.24 },
    { lat: -6.972230, long: 107.629946, volt: 4.21, arus: -0.04 },
    { lat: -6.972231, long: 107.630001, volt: 4.29, arus: 0.04 },
    { lat: -6.972232, long: 107.630056, volt: 4.35, arus: -0.18 },
    { lat: -6.972234, long: 107.630111, volt: 4.28, arus: -0.22 },
    
    // PERJALANAN PUTAR BALIK (Titik B kembali ke Titik A)
    { lat: -6.972235, long: 107.630166, volt: 4.42, arus: 0.11 },
    { lat: -6.972234, long: 107.630111, volt: 4.54, arus: 0.04 },
    { lat: -6.972232, long: 107.630056, volt: 4.47, arus: -0.19 },
    { lat: -6.972231, long: 107.630001, volt: 4.52, arus: 0.15 },
    { lat: -6.972230, long: 107.629946, volt: 4.35, arus: -0.22 },
    { lat: -6.972228, long: 107.629891, volt: 4.25, arus: 0.21 },
    { lat: -6.972227, long: 107.629837, volt: 4.54, arus: -0.18 },
    { lat: -6.972226, long: 107.629782, volt: 4.48, arus: -0.12 },
    { lat: -6.972224, long: 107.629727, volt: 4.23, arus: 0.03 },
    { lat: -6.972223, long: 107.629672, volt: 4.23, arus: 0.07 },
    { lat: -6.972221, long: 107.629617, volt: 4.59, arus: -0.30 },
    { lat: -6.972220, long: 107.629562, volt: 4.31, arus: -0.31 },
    { lat: -6.972219, long: 107.629507, volt: 4.27, arus: -0.33 },
    { lat: -6.972217, long: 107.629452, volt: 4.46, arus: -0.23 },
    { lat: -6.972216, long: 107.629397, volt: 4.33, arus: -0.37 },
    { lat: -6.972215, long: 107.629343, volt: 4.52, arus: -0.09 },
    { lat: -6.972213, long: 107.629288, volt: 4.34, arus: -0.32 },
    { lat: -6.972212, long: 107.629233, volt: 4.40, arus: -0.10 },
    { lat: -6.972211, long: 107.629178, volt: 4.48, arus: -0.12 },
    { lat: -6.972209, long: 107.629123, volt: 4.41, arus: 0.16 }
];

// --- 3. STATE APLIKASI ---
let currentIndex = 0; // Posisi data saat ini
let isEngineOn = false; // Status Mesin (Default Mati)
let isMovingForward = true;

// Setup Koneksi MQTT
const client = mqtt.connect(CONFIG.BROKER);

// Setup Input Keyboard
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);

// --- 4. EVENT SAAT TERHUBUNG ---
client.on('connect', () => {
    renderUI(); // Tampilkan UI awal
    
    // Loop Utama (Setiap 5 Detik)
    setInterval(() => {
        publishPacket();
    }, 5000); 
});

// --- 5. LOGIKA PENGIRIMAN DATA ---
function publishPacket() {
    // Ambil data saat ini dari array
    const point = pathData[currentIndex];

    // Siapkan Payload
    const payload = {
        id_alat: CONFIG.ID_ALAT,
        lat: point.lat,
        long: point.long,
        tegangan: point.volt,
        arus: point.arus,
        // Status Mesin dikirim ke backend
        // Jika backend butuh boolean true/false atau string 'ON'/'OFF', sesuaikan disini
        status_mesin: isEngineOn ? 'ON' : 'OFF', 
    };

    // KIRIM KE MQTT
    client.publish(CONFIG.TOPIC, JSON.stringify(payload));

    /// LOGIKA PERGERAKAN DATA (PING-PONG / BOLAK-BALIK)
    if (isEngineOn) {
        if (isMovingForward) {
            currentIndex++; // Traktor maju
            
            // Jika sudah sampai di titik paling ujung (Titik B)
            if (currentIndex >= pathData.length - 1) {
                currentIndex = pathData.length - 1; // Tahan di ujung
                isMovingForward = false; // Putar balik arah menjadi mundur
            }
        } else {
            currentIndex--; // Traktor mundur
            
            // Jika sudah kembali ke titik paling awal (Titik A)
            if (currentIndex <= 0) {
                currentIndex = 0; // Tahan di awal
                isMovingForward = true; // Putar balik arah menjadi maju lagi
            }
        }
    }

    // Update Tampilan Console
    renderUI(payload);
}

// --- 6. LOGIKA KEYBOARD (IGNITION ONLY) ---
process.stdin.on('keypress', (str, key) => {
    // Keluar Program (Ctrl+C atau Q)
    if ((key.ctrl && key.name === 'c') || key.name === 'q') {
        console.log("\n🛑 Simulator Berhenti.");
        process.exit(); 
    }

    // Kontrol Mesin (SPASI)
    if (key.name === 'space') {
        isEngineOn = !isEngineOn; // Toggle ON/OFF
        renderUI(pathData[currentIndex]); // Refresh UI langsung
        // Kita bisa kirim update langsung saat ditekan agar responsif
        publishPacket(); 
    }
});

// --- 7. TAMPILAN CONSOLE (UI) ---
function renderUI(currentData = pathData[currentIndex]) {
    console.clear();
    console.log(`🚜 TRAKTOR SIMULATOR - DATASET MODE (ID: ${CONFIG.ID_ALAT})`);
    console.log(`==================================================`);
    
    // Status Mesin
    if (isEngineOn) {
        console.log(`🔑 STATUS MESIN : \x1b[32m🟢 MENYALA (RUNNING)\x1b[0m`); // Tulisan Hijau
        console.log(`📡 STATUS DATA  : Mengirim & Bergerak otomatis...`);
    } else {
        console.log(`🔑 STATUS MESIN : \x1b[31m🔴 MATI (OFF)\x1b[0m`); // Tulisan Merah
        console.log(`📡 STATUS DATA  : Mengirim detak jantung (Lokasi Tetap)`);
    }

    console.log(`--------------------------------------------------`);
    console.log(`📍 KOORDINAT    : ${currentData.lat || currentData.lat}, ${currentData.long || currentData.long}`);
    console.log(`⚡ TEGANGAN     : ${currentData.tegangan || currentData.volt} V`);
    console.log(`🔋 ARUS         : ${currentData.arus || currentData.arus} mA`);
    console.log(`📊 INDEX DATA   : [ ${currentIndex + 1} / ${pathData.length} ]`);
    console.log(`--------------------------------------------------`);
    console.log(`\n🎮 KONTROL:`);
    console.log(`   [SPASI] : Putar Kunci Kontak (ON / OFF)`);
    console.log(`   [Q]     : Keluar Simulator`);
}