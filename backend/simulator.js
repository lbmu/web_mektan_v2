const mqtt = require('mqtt');
const readline = require('readline');


const CONFIG = {
    ID_ALAT: 1, 
    TOPIC: 'project-mektan/v1/data', 
    BROKER: 'mqtts://a9ff4edaea834015978986b00dc65210.s1.eu.hivemq.cloud:8883', 
    USERNAME: 'simon_alsintan',
    PASSWORD: 'BPMektanJabar12'  
};

// --- 2. DATASET JALUR SIMULASI (MAJU & PUTAR BALIK MENGGUNAKAN 40 TITIK) ---
const pathData = [
    // Fase 1: Mesin Menyala (Idle & Pemanasan)
    { lat: -6.972208, long: 107.629068, volt: 12.4, arus: 1.2, rpm: 800,  bbm_persen: 85 },
    { lat: -6.972209, long: 107.629123, volt: 12.8, arus: 1.5, rpm: 950,  bbm_persen: 85 },
    { lat: -6.972211, long: 107.629178, volt: 13.2, arus: 2.1, rpm: 1200, bbm_persen: 85 },
    { lat: -6.972212, long: 107.629233, volt: 13.6, arus: 2.8, rpm: 1550, bbm_persen: 85 },
    
    // Fase 2: Mulai Berjalan & Bekerja Normal
    { lat: -6.972213, long: 107.629288, volt: 13.8, arus: 3.2, rpm: 1800, bbm_persen: 84 },
    { lat: -6.972215, long: 107.629343, volt: 14.1, arus: 3.5, rpm: 2100, bbm_persen: 84 },
    { lat: -6.972216, long: 107.629397, volt: 14.2, arus: 3.8, rpm: 2250, bbm_persen: 84 },
    { lat: -6.972217, long: 107.629452, volt: 14.1, arus: 3.7, rpm: 2200, bbm_persen: 84 },
    { lat: -6.972219, long: 107.629507, volt: 14.2, arus: 4.1, rpm: 2350, bbm_persen: 84 },
    { lat: -6.972220, long: 107.629562, volt: 14.0, arus: 4.0, rpm: 2300, bbm_persen: 83 },
    
    // Fase 3: Beban Berat (Menyentuh Zona Merah / Redline Spidometer > 2400)
    { lat: -6.972221, long: 107.629617, volt: 13.9, arus: 4.8, rpm: 2450, bbm_persen: 83 },
    { lat: -6.972223, long: 107.629672, volt: 13.8, arus: 5.2, rpm: 2550, bbm_persen: 83 },
    { lat: -6.972224, long: 107.629727, volt: 13.8, arus: 5.5, rpm: 2580, bbm_persen: 83 },
    { lat: -6.972226, long: 107.629782, volt: 13.9, arus: 5.1, rpm: 2500, bbm_persen: 83 },
    { lat: -6.972227, long: 107.629837, volt: 14.0, arus: 4.7, rpm: 2420, bbm_persen: 82 },
    
    // Fase 4: Stabilisasi Beban
    { lat: -6.972228, long: 107.629891, volt: 14.2, arus: 4.2, rpm: 2350, bbm_persen: 82 },
    { lat: -6.972230, long: 107.629946, volt: 14.1, arus: 3.9, rpm: 2280, bbm_persen: 82 },
    { lat: -6.972231, long: 107.630001, volt: 14.2, arus: 4.0, rpm: 2320, bbm_persen: 82 },
    { lat: -6.972232, long: 107.630056, volt: 14.1, arus: 3.8, rpm: 2250, bbm_persen: 82 },
    { lat: -6.972234, long: 107.630111, volt: 14.2, arus: 3.6, rpm: 2150, bbm_persen: 82 },
    
    // Fase 5: Putar Balik (Manuver, RPM Fluktuatif Cepat)
    { lat: -6.972235, long: 107.630166, volt: 14.0, arus: 2.5, rpm: 1500, bbm_persen: 81 },
    { lat: -6.972234, long: 107.630111, volt: 13.9, arus: 2.8, rpm: 1750, bbm_persen: 81 },
    { lat: -6.972232, long: 107.630056, volt: 14.1, arus: 3.4, rpm: 2000, bbm_persen: 81 },
    { lat: -6.972231, long: 107.630001, volt: 14.2, arus: 3.9, rpm: 2200, bbm_persen: 81 },
    
    // Fase 6: Bekerja Kembali di Jalur Sebelah
    { lat: -6.972230, long: 107.629946, volt: 14.1, arus: 4.1, rpm: 2350, bbm_persen: 81 },
    { lat: -6.972228, long: 107.629891, volt: 14.0, arus: 4.4, rpm: 2450, bbm_persen: 81 },
    { lat: -6.972227, long: 107.629837, volt: 13.9, arus: 4.6, rpm: 2520, bbm_persen: 81 },
    { lat: -6.972226, long: 107.629782, volt: 14.0, arus: 4.3, rpm: 2400, bbm_persen: 81 },
    { lat: -6.972224, long: 107.629727, volt: 14.1, arus: 4.0, rpm: 2300, bbm_persen: 81 },
    { lat: -6.972223, long: 107.629672, volt: 14.2, arus: 3.8, rpm: 2250, bbm_persen: 81 },
    
    // Fase 7: Fluktuasi Minor di Ujung Jalur
    { lat: -6.972221, long: 107.629617, volt: 14.1, arus: 3.7, rpm: 2220, bbm_persen: 81 },
    { lat: -6.972220, long: 107.629562, volt: 14.2, arus: 3.9, rpm: 2280, bbm_persen: 81 },
    { lat: -6.972219, long: 107.629507, volt: 14.1, arus: 4.2, rpm: 2360, bbm_persen: 81 },
    { lat: -6.972217, long: 107.629452, volt: 14.2, arus: 4.0, rpm: 2310, bbm_persen: 81 },
    { lat: -6.972216, long: 107.629397, volt: 14.1, arus: 3.8, rpm: 2240, bbm_persen: 81 },
    { lat: -6.972215, long: 107.629343, volt: 14.2, arus: 3.6, rpm: 2180, bbm_persen: 81 },
    
    // Fase 8: Melambat & Idle (Kembali ke titik awal)
    { lat: -6.972213, long: 107.629288, volt: 14.0, arus: 2.9, rpm: 1800, bbm_persen: 81 },
    { lat: -6.972212, long: 107.629233, volt: 13.8, arus: 2.2, rpm: 1400, bbm_persen: 81 },
    { lat: -6.972211, long: 107.629178, volt: 13.5, arus: 1.5, rpm: 1000, bbm_persen: 81 },
    { lat: -6.972209, long: 107.629123, volt: 12.6, arus: 1.2, rpm: 850,  bbm_persen: 81 }
];

// --- 3. STATE APLIKASI ---
let currentIndex = 0; 
let isEngineOn = false; 

// SUNTIKKAN KUNCI (USERNAME & PASSWORD) SAAT KONEKSI
const client = mqtt.connect(CONFIG.BROKER, {
    username: CONFIG.USERNAME,
    password: CONFIG.PASSWORD,
    rejectUnauthorized: false // Membantu menghindari error sertifikat TLS di komputer lokal
});

readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);

// --- 4. EVENT SAAT TERHUBUNG ---
client.on('connect', () => {
    renderUI(); 
    
    // Loop Utama (Dipercepat menjadi 3 Detik agar pergerakan peta lebih mulus)
    setInterval(() => {
        publishPacket();
    }, 3000); 
});

client.on('error', (err) => {
    console.error('❌ Gagal terhubung ke Broker:', err.message);
});

// --- 5. LOGIKA PENGIRIMAN DATA ---
function publishPacket() {
    const point = pathData[currentIndex];

    const payload = {
        id_alat: CONFIG.ID_ALAT,
        lat: point.lat,
        long: point.long,
        tegangan: point.volt,
        arus: point.arus,
        status_mesin: isEngineOn ? 'ON' : 'OFF', 
        rpm: point.rpm,
        bbm_persen: point.bbm_persen
    };

    client.publish(CONFIG.TOPIC, JSON.stringify(payload));

    if (isEngineOn) {
        currentIndex++; 
        
        // LOOP DATASET BERULANG TERUS MENERUS
        if (currentIndex >= pathData.length) {
            currentIndex = 0; 
        }
    }

    renderUI(payload);
}

// --- 6. LOGIKA KEYBOARD ---
process.stdin.on('keypress', (str, key) => {
    if ((key.ctrl && key.name === 'c') || key.name === 'q') {
        console.log("\n🛑 Simulator Berhenti.");
        process.exit(); 
    }

    if (key.name === 'space') {
        isEngineOn = !isEngineOn; 
        renderUI(pathData[currentIndex]); 
        publishPacket(); 
    }
});

// --- 7. TAMPILAN CONSOLE (UI) ---
function renderUI(currentData = pathData[currentIndex]) {
    console.clear();
    console.log(`🚜 TRAKTOR SIMULATOR (ID: ${CONFIG.ID_ALAT}) - 🔒 PRIVATE CLOUD`);
    console.log(`==================================================`);
    
    if (isEngineOn) {
        console.log(`🔑 STATUS MESIN : \x1b[32m🟢 MENYALA (RUNNING)\x1b[0m`); 
        console.log(`📡 STATUS DATA  : Bergerak dinamis...`);
    } else {
        console.log(`🔑 STATUS MESIN : \x1b[31m🔴 MATI (OFF)\x1b[0m`); 
        console.log(`📡 STATUS DATA  : Heartbeat (Posisi Tetap)`);
    }

    console.log(`--------------------------------------------------`);
    console.log(`📍 KOORDINAT    : ${currentData.lat || currentData.lat}, ${currentData.long || currentData.long}`);
    console.log(`⚡ TEGANGAN     : ${currentData.tegangan || currentData.volt} V`);
    console.log(`🔋 ARUS         : ${currentData.arus || currentData.arus} mA`);
    console.log(`📊 RPM          : ${currentData.rpm || currentData.rpm}`);
    console.log(`⛽ BBM          : ${currentData.bbm_persen || currentData.bbm_persen}%`);
    console.log(`--------------------------------------------------`);
    console.log(`\n🎮 KONTROL:`);
    console.log(`   [SPASI] : Putar Kunci Kontak (ON / OFF)`);
    console.log(`   [Q]     : Keluar Simulator`);
}