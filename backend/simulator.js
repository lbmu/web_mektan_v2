const mqtt = require('mqtt');
const readline = require('readline');

const CONFIG = {
    ID_ALAT: 1, 
    TOPIC: 'project-mektan/v1/data', 
    BROKER: 'mqtts://a9ff4edaea834015978986b00dc65210.s1.eu.hivemq.cloud:8883', 
    USERNAME: 'simon_alsintan',
    PASSWORD: 'BPMektanJabar12'  
};

// =====================================================================
// 2. GENERATOR LINTASAN OTOMATIS (A -> B -> U-Turn -> A)
// =====================================================================
function generateTractorPath() {
    const path = [];
    const startLat = -6.85053596930971;
    const startLng = 107.27627118207303;
    const endLat = -6.850517759463574;
    const endLng = 107.27670896866479;
    
    const steps = 15; // Jumlah titik dari ujung ke ujung

    // FASE 1: Maju (Titik A ke B)
    for (let i = 0; i <= steps; i++) {
        let currentLat = startLat + ((endLat - startLat) * (i / steps));
        let currentLng = startLng + ((endLng - startLng) * (i / steps));
        let hdop = 113; // Sinyal Normal (1.13)
        let info = "Lurus Maju";

        // SIMULASI MULTI-PATH ERROR (Di tengah perjalanan)
        if (i === 7) {
            currentLat += 0.000060; // Traktor tiba-tiba melompat ~6 meter
            hdop = 310; // Mengirimkan sinyal buruk (HDOP 3.10) agar Backend tahu ini error
            info = "⚠️ Simulasi Drift (HDOP Buruk)";
        }

        // PERBAIKAN: long menjadi lng, BBM dihapus
        path.push({ lat: currentLat, lng: currentLng, V: 13, I: 4.2, hd: hdop, st: 8, info: info });
    }

    // FASE 2: U-Turn di Ujung Lahan
    // Geser sedikit lintang (latitude) ke arah luar/samping untuk pindah jalur
    const uTurnLat = endLat - 0.000020; 
    path.push({ lat: uTurnLat, lng: endLng, V: 14.1, I: 4.2, hd: 120, st: 8, info: "🔄 Putar Balik" });

    // FASE 3: Mundur (Titik B kembali ke A di jalur sebelah)
    for (let i = 0; i <= steps; i++) {
        // Balikkan rumus: dari uTurnLat (di B) kembali ke startLat (di A)
        let currentLat = uTurnLat + ((startLat - uTurnLat) * (i / steps));
        let currentLng = endLng + ((startLng - endLng) * (i / steps));

        path.push({ lat: currentLat, lng: currentLng, V: 14, I: 4.2, hd: 110, st: 9, info: "Lurus Kembali" });
    }

    return path;
}

const pathData = generateTractorPath();

// --- 3. STATE APLIKASI ---
let currentIndex = 0; 
let isEngineOn = false; 

const client = mqtt.connect(CONFIG.BROKER, {
    username: CONFIG.USERNAME,
    password: CONFIG.PASSWORD,
    rejectUnauthorized: false
});

readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);

// --- 4. EVENT SAAT TERHUBUNG ---
client.on('connect', () => {
    renderUI(); 
    
    // Interval 3 detik mengikuti standar pengiriman ESP32 Anda
    setInterval(() => {
        publishPacket();
    }, 3000); 
});

client.on('error', (err) => {
    console.error('❌ Gagal terhubung ke Broker:', err.message);
});

// --- 5. LOGIKA PENGIRIMAN DATA (FORMAT JSON BARU) ---
function publishPacket() {
    const point = pathData[currentIndex];

    // Jika user menekan SPASI untuk mematikan mesin, paksa Voltase (V) turun di bawah 12V
    const currentVoltage = isEngineOn ? point.V : 0.5; 

    // Struktur JSON Terbaru (BBM dihapus, menggunakan lng)
    const payload = {
        id: CONFIG.ID_ALAT,
        lat: point.lat,
        lng: point.lng,
        V: currentVoltage,
        I: isEngineOn ? point.I : 0.5, // Arus drop jika mesin mati
        hd: point.hd,
        st: point.st,
        ts: Math.floor(Date.now() / 1000) // Waktu Unix saat ini
    };

    // Kirim hanya jika mesin dianggap menyala (agar tidak spam saat diparkir, opsional)
    client.publish(CONFIG.TOPIC, JSON.stringify(payload));

    if (isEngineOn) {
        currentIndex++; 
        if (currentIndex >= pathData.length) {
            currentIndex = 0; // Ulangi dari awal lahan
        }
    }

    // Teruskan JSON payload yang dikirim agar bisa dilihat di layar Console UI
    renderUI(payload, point.info);
}

// --- 6. LOGIKA KEYBOARD ---
process.stdin.on('keypress', (str, key) => {
    if ((key.ctrl && key.name === 'c') || key.name === 'q') {
        console.log("\n🛑 Simulator Berhenti.");
        process.exit(); 
    }

    if (key.name === 'space') {
        isEngineOn = !isEngineOn; 
        // Render UI sementara (pakai data dummy titik saat ini)
        renderUI({
            lat: pathData[currentIndex].lat,
            lng: pathData[currentIndex].lng,
            V: isEngineOn ? pathData[currentIndex].V : 0.5,
            I: isEngineOn ? pathData[currentIndex].I : 0.5,
            st: pathData[currentIndex].st,
            hd: pathData[currentIndex].hd,
            ts: Math.floor(Date.now() / 1000)
        }, "Kontak Diputar"); 
        publishPacket(); 
    }
});

// --- 7. TAMPILAN CONSOLE (UI) ---
function renderUI(currentData = {lat: 0, lng: 0, st: 0, hd: 0, V: 0, I: 0}, infoLabel = "Menunggu") {
    console.clear();
    console.log(`🚜 AVERY ANR 127 SIMULATOR (ID: ${CONFIG.ID_ALAT}) - JSON v2.1`);
    console.log(`==================================================`);
    
    if (isEngineOn) {
        console.log(`🔑 STATUS MESIN : \x1b[32m🟢 MENYALA (RUNNING)\x1b[0m (V >= 12.0)`); 
        console.log(`📡 PERGERAKAN   : ${infoLabel}`);
    } else {
        console.log(`🔑 STATUS MESIN : \x1b[31m🔴 MATI (OFF)\x1b[0m (V < 12.0)`); 
        console.log(`📡 PERGERAKAN   : Parkir (Posisi Tetap)`);
    }

    console.log(`--------------------------------------------------`);
    console.log(`📍 KOORDINAT : ${currentData.lat.toFixed(6)}, ${currentData.lng.toFixed(6)}`);
    console.log(`📶 GPS QUAL  : Satelit: ${currentData.st} | HDOP: ${(currentData.hd / 100).toFixed(2)}`);
    console.log(`⚡ TEGANGAN  : ${currentData.V} V`);
    console.log(`🔋 ARUS      : ${currentData.I} A`);
    // BBM Dihapus
    console.log(`⏱️ TIMESTAMP : ${currentData.ts || Math.floor(Date.now() / 1000)}`);
    console.log(`--------------------------------------------------`);
    console.log(`\n🎮 KONTROL:`);
    console.log(`   [SPASI] : Putar Kunci Kontak (Menyala/Mati)`);
    console.log(`   [Q]     : Keluar Simulator`);
}