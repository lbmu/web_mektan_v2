const mqtt = require('mqtt');
const readline = require('readline');

// --- 1. KONFIGURASI ---
const CONFIG = {
    ID_ALAT: 1, 
    TOPIC: 'project-mektan/v1/data', 
    BROKER: 'mqtt://broker.hivemq.com'
};

// --- 2. DATASET JALUR (Dari Data Log Riil) ---
const pathData = [
    { lat: -6.972258, long: -6.972258, volt: 4.25, arus: -0.30 },
    { lat: -6.972251, long: 107.629323, volt: 4.30, arus: 0.30 },
    { lat: -6.972249, long: 107.629349, volt: 4.54, arus: -0.20 },
    { lat: -6.972248, long: 107.629382, volt: 4.48, arus: 0.00 },
    { lat: -6.972245, long: 107.629409, volt: 4.47, arus: -0.30 },
    { lat: -6.972243, long: 107.629445, volt: 4.38, arus: -0.30 },
    { lat: -6.972241, long: 107.629483, volt: 4.34, arus: -0.20 },
    { lat: -6.972237, long: 107.629514, volt: 4.42, arus: -0.10 },
    { lat: -6.972238, long: 107.629546, volt: 4.40, arus: -0.40 },
    { lat: -6.972242, long: 107.629578, volt: 4.30, arus: -0.20 },
    { lat: -6.972242, long: 107.629610, volt: 4.54, arus: -0.10 },
    { lat: -6.972243, long: 107.629644, volt: 4.29, arus: -0.30 },
    { lat: -6.972243, long: 107.629677, volt: 4.62, arus: -0.10 },
    { lat: -6.972246, long: 107.629726, volt: 4.45, arus: -0.30 },
    { lat: -6.972245, long: 107.629739, volt: 4.35, arus: -0.20 },
    { lat: -6.972239, long: 107.629761, volt: 4.26, arus: -0.20 },
    { lat: -6.972236, long: 107.629788, volt: 4.25, arus: -0.20 }
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