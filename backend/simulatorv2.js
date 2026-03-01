const mqtt = require('mqtt');
const readline = require('readline');

// --- KONFIGURASI SIMULATOR ---
const CONFIG = {
    // Ganti ID ini sesuai dengan ID alat yang ada di database Anda (misal: 20)
    ID_ALAT: 20, 
    // Topik MQTT (Harus sama persis dengan Frontend & Backend)
    TOPIC: 'project-mektan/v1/data', 
    BROKER: 'mqtt://broker.hivemq.com',
    // Lokasi Awal (Misal: Tengah Sawah di Subang)
    START_LAT: -6.972258,
    START_LONG: 107.629303
};

// --- STATE TRAKTOR ---
let state = {
    lat: CONFIG.START_LAT,
    long: CONFIG.START_LONG,
    engine: 'OFF', // ON atau OFF
    speed: 0,
    heading: 0
};

// Setup Koneksi MQTT
const client = mqtt.connect(CONFIG.BROKER);

client.on('connect', () => {
    console.clear();
    console.log(`🚜 SIMULATOR TRAKTOR TERHUBUNG (ID: ${CONFIG.ID_ALAT})`);
    console.log(`📡 Broker: ${CONFIG.BROKER}`);
    console.log(`-------------------------------------------------`);
    console.log(`🎮 KONTROL KEYBOARD:`);
    console.log(`   [SPASI] : Nyalakan / Matikan Mesin (Ignition)`);
    console.log(`   [W]     : Maju (Gerak ke Utara)`);
    console.log(`   [S]     : Mundur (Gerak ke Selatan)`);
    console.log(`   [A]     : Kiri (Gerak ke Barat)`);
    console.log(`   [D]     : Kanan (Gerak ke Timur)`);
    console.log(`   [Q]     : Keluar Simulator`);
    console.log(`-------------------------------------------------`);
    renderStatus();
});

// Loop Pengiriman Data (Detak Jantung Alat)
setInterval(() => {
    publishData();
}, 500); // Kirim data setiap 2 detik

function publishData() {
    // Payload Data Lengkap (Sesuai Request Backend Baru)
    const payload = {
        id_alat: CONFIG.ID_ALAT,
        lat: state.lat,
        long: state.long,
        status_mesin: state.engine, // Ini KUNCI untuk Argo!
        speed: state.speed
    };

    client.publish(CONFIG.TOPIC, JSON.stringify(payload));
}

// --- LOGIKA KONTROL KEYBOARD ---
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);

process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name === 'c') process.exit(); // Ctrl+C untuk keluar
    if (key.name === 'q') process.exit(); // Q untuk keluar

    // 1. KONTROL MESIN (SPASI)
    if (key.name === 'space') {
        state.engine = state.engine === 'OFF' ? 'ON' : 'OFF';
        // Reset kecepatan jika mesin mati
        if (state.engine === 'OFF') state.speed = 0;
    }

    // 2. KONTROL GERAK (Hanya bisa gerak kalau Mesin ON)
    if (state.engine === 'ON') {
        const moveStep = 0.00015; // Kecepatan pergerakan koordinat
        
        if (key.name === 'w') { state.lat += moveStep; state.speed = 10; }
        if (key.name === 's') { state.lat -= moveStep; state.speed = 10; }
        if (key.name === 'a') { state.long -= moveStep; state.speed = 10; }
        if (key.name === 'd') { state.long += moveStep; state.speed = 10; }
    }

    renderStatus();
    // Kirim update langsung saat tombol ditekan agar responsif di peta
    publishData();
});

// Fungsi Tampilan Console Cantik
function renderStatus() {
    console.clear();
    console.log(`🚜 TRAKTOR SIMULATOR (ID: ${CONFIG.ID_ALAT})`);
    console.log(`-------------------------------------------`);
    
    // Status Mesin dengan Warna
    const statusIcon = state.engine === 'ON' ? '🟢 MENYALA' : '⚫ MATI (PARKIR)';
    console.log(`KUNCI KONTAK : ${statusIcon}`);
    
    console.log(`LOKASI       : ${state.lat.toFixed(6)}, ${state.long.toFixed(6)}`);
    console.log(`SPEED        : ${state.speed} km/h`);
    
    if (state.engine === 'OFF') {
        console.log(`\n⚠️  MESIN MATI. Tekan [SPASI] untuk menyalakan.`);
    } else {
        console.log(`\n🚀 MESIN HIDUP. Gunakan [W/A/S/D] untuk bergerak.`);
    }
}