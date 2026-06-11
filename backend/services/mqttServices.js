const mqtt = require('mqtt');
const db = require('../config/database');

// FUNGSI HITUNG JARAK (Haversine Formula) 
function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371e3; 
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
}

const options = {
    host: process.env.MQTT_HOST,
    port: process.env.MQTT_PORT,
    protocol: 'mqtts', 
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    rejectUnauthorized: true 
};
const TOPIC = process.env.MQTT_TOPIC;
const client = mqtt.connect(options);

// ========================================================================
// 🧠 MEMORI BUFFER UNTUK JALUR LAMBAT (SLIDING WINDOW)
// ========================================================================
const tractorBuffers = {};

client.on('connect', () => {
    console.log(`✅ Backend Terhubung! (Arsitektur JALUR GANDA Aktif - Format JSON Baru)`);
    client.subscribe(TOPIC);
});

client.on('error', (err) => console.error('❌ MQTT Error:', err.message));
client.on('reconnect', () => console.log('🔄 Menyambung ulang...'));
client.on('offline', () => console.log('⚠️ Terputus dari broker MQTT.'));

client.on('message', (topic, message) => {
    try {
        const rawData = JSON.parse(message.toString());

        // 🛠️ TAHAP ADAPTER: DISESUAIKAN DENGAN FORMAT JSON TERBARU (Tanpa BBM)
        const data = {
            id: rawData.id, 
            lat: parseFloat(rawData.lat) || 0,
            long: parseFloat(rawData.lng) || 0, 
            V: parseFloat(rawData.V) || 0,
            I: parseFloat(rawData.I) || 0,
            hdop: parseInt(rawData.hd) || 0,
            satelit: parseInt(rawData.st) || 0,
            ts: rawData.ts || 0,
            status_mesin: parseFloat(rawData.V) >= 11.5 ? 'ON' : 'OFF'
        };

        // 🚀 JALUR CEPAT (LIVE UI MAP)
        console.log(`[LIVE MODE] ID:${data.id} | Koor: ${data.lat}, ${data.long} | Aki:${data.V}V | HDOP:${data.hdop}`);

        // UPDATE: Menghapus kolom bbm dari kueri
        const queryUpdateLive = `
            UPDATE monitoring_status 
            SET status_mesin = $1, 
                status_iot = 'ON', 
                last_heartbeat = NOW(),
                tegangan_aki = $3, 
                latitude = $4, 
                longitude = $5, 
                hdop = $6, 
                satelit = $7
            WHERE alsintan_id = $2
        `;
        db.query(queryUpdateLive, [data.status_mesin, data.id, data.V, data.lat, data.long, data.hdop, data.satelit]);

        // 2. Update Lokasi Utama
        db.query(`UPDATE alsintan SET latitude = $1, longitude = $2 WHERE alsintan_id = $3`, [data.lat, data.long, data.id]);

        // 3. Simpan Riwayat Telemetri (Tanpa BBM)
        if (data.status_mesin === 'ON') {
            const queryTelemetri = `
                INSERT INTO riwayat_telemetri (alsintan_id, tegangan_aki, arus, waktu_rekam) 
                VALUES ($1, $2, $3, NOW())
            `;
            db.query(queryTelemetri, [data.id, data.V, data.I]);
        }

// ----------------------------------------------------------------
        // 📥 MASUKKAN KE BUFFER UNTUK JALUR LAMBAT (PENGHITUNGAN LAHAN)
        // ----------------------------------------------------------------
        if (data.status_mesin === 'ON') {
            if (!tractorBuffers[data.id]) {
                tractorBuffers[data.id] = {
                    lastValidLat: data.lat,
                    lastValidLong: data.long,
                    lastTime: Date.now(),
                    queue: []
                };
            }
            // Simpan titik ke antrean beserta HDOP untuk filter
            tractorBuffers[data.id].queue.push({
                lat: data.lat,
                long: data.long,
                hdop: data.hdop,
                time: Date.now()
            });
        } else {
            // [LOGIKA BARU - PENCEGAH TELEPORTASI BACKEND]
            // Jika mesin OFF, hapus/buang memori titik koordinat terakhirnya!
            // Agar saat mesin dinyalakan lagi di tempat lain, ia mulai menghitung dari 0 lagi.
            if (tractorBuffers[data.id]) {
                delete tractorBuffers[data.id];
            }
        }

    } catch (error) {
        // console.error("Gagal parsing JSON MQTT:", error.message);
    }
});

// ========================================================================
// ⚙️ BACKGROUND WORKER (SLIDING WINDOW & SENSOR FUSION)
// ========================================================================
setInterval(() => {
    Object.keys(tractorBuffers).forEach(id_alat => {
        const buffer = tractorBuffers[id_alat];

        if (buffer.queue.length === 0) return; 

        let validDistanceToDB = 0;
        const validPointsToInsert = [];

        buffer.queue.forEach(point => {
            const rawDist = calculateDistance(buffer.lastValidLat, buffer.lastValidLong, point.lat, point.long);
            
            // Waktu dihitung dari TITIK VALID TERAKHIR
            let timeDiffSec = (point.time - buffer.lastTime) / 1000;
            if (timeDiffSec <= 0) timeDiffSec = 1;
            
            const speedKmh = (rawDist / timeDiffSec) * 3.6;
            let isDrift = false;

            // 🛡️ Lapis Filter Sensor Fusion (Tanpa Speedometer, Menggunakan HDOP)
            if (speedKmh > 20) {
                isDrift = true; // [Lapis 1] Anti-Spike Ekstrem (> 20 km/jam)
            } else if (rawDist < 1.0) { 
                isDrift = true; // [Lapis 2] Noise Parkir
            } else if (point.hdop > 250 && rawDist > 3.0) {
                // [Lapis 3 BARU] Memanfaatkan Parameter HDOP bawaan Ublox M8N
                // Jika HDOP buruk (> 2.5) dan jaraknya melompat lebih dari 3 meter, itu pasti Multi-path!
                isDrift = true; 
            }

            if (!isDrift) {
                const ALPHA = 0.4;
                const finalLat = (ALPHA * point.lat) + ((1 - ALPHA) * buffer.lastValidLat);
                const finalLong = (ALPHA * point.long) + ((1 - ALPHA) * buffer.lastValidLong);

                const smoothedDist = calculateDistance(buffer.lastValidLat, buffer.lastValidLong, finalLat, finalLong);

                validDistanceToDB += smoothedDist;
                validPointsToInsert.push({ lat: finalLat, long: finalLong });

                // UPDATE REFERENSI MEMORI
                buffer.lastValidLat = finalLat;
                buffer.lastValidLong = finalLong;
                buffer.lastTime = point.time; 
            } 
            // Jika Drift, buffer.lastTime JANGAN DI-UPDATE agar stopwatch terus berjalan.
        });

        buffer.queue = [];

        // 💾 BATCH INSERT KE DATABASE
        if (validPointsToInsert.length > 0) {
            db.query(`UPDATE monitoring_status SET total_jarak_kerja = total_jarak_kerja + $1 WHERE alsintan_id = $2`,
                    [validDistanceToDB, id_alat]);

            validPointsToInsert.forEach(vp => {
                db.query(`INSERT INTO riwayat_perjalanan (alsintan_id, latitude, longitude, waktu_rekam) VALUES ($1, $2, $3, NOW())`,
                        [id_alat, vp.lat, vp.long]);
            });
        }
    });
}, 10000);

// ========================================================================
// 🧹 WATCHDOG SWEEPER (CEK TIMEOUT IOT MATI > 10 MENIT)
// ========================================================================
setInterval(() => {
    // Kueri: Ubah IoT jadi OFF dan Mesin jadi UNKNOWN jika last_heartbeat lebih dari 10 menit yang lalu
    const queryTimeout = `
        UPDATE monitoring_status
        SET status_iot = 'OFF', status_mesin = 'UNKNOWN'
        WHERE last_heartbeat < NOW() - INTERVAL '10 minutes'
        AND status_iot = 'ON'
    `;
    
    db.query(queryTimeout, (err, result) => {
        if (err) {
            console.error("❌ Error Watchdog IoT:", err.message);
        } else if (result && result.rowCount > 0) {
            console.log(`⚠️ [WATCHDOG] ${result.rowCount} traktor kehilangan sinyal (>10 menit). Status diubah ke IoT: OFF | Mesin: UNKNOWN.`);
        }
    });
}, 60000);

module.exports = client;