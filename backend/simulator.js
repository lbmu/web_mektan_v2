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
    console.log(`📊 INDEX DATA   : [ ${currentIndex + 1} / ${pathData.length} ]`);
    console.log(`--------------------------------------------------`);
    console.log(`\n🎮 KONTROL:`);
    console.log(`   [SPASI] : Putar Kunci Kontak (ON / OFF)`);
    console.log(`   [Q]     : Keluar Simulator`);
}