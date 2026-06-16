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
// 🧠 MEMORI BUFFER UNTUK JALUR LAMBAT (SLIDING WINDOW & HOUR METER)
// ========================================================================
const tractorBuffers = {};

// TAMBAHAN: Memori khusus untuk menghitung detak stopwatch (Hour Meter)
const hmAccumulator = {}; // Menyimpan total pecahan jam sebelum disetor ke DB
const lastPingTime = {};  // Menyimpan waktu (timestamp) pesan MQTT terakhir

client.on('connect', () => {
    console.log(`✅ Backend Terhubung! (Arsitektur JALUR GANDA & HOUR METER Aktif)`);
    client.subscribe(TOPIC);
});

client.on('error', (err) => console.error('❌ MQTT Error:', err.message));
client.on('reconnect', () => console.log('🔄 Menyambung ulang...'));
client.on('offline', () => console.log('⚠️ Terputus dari broker MQTT.'));

client.on('message', (topic, message) => {
    try {
        const rawData = JSON.parse(message.toString());

        const data = {
            id: rawData.id, 
            lat: parseFloat(rawData.lat) || 0,
            long: parseFloat(rawData.lng) || 0, 
            V: parseFloat(rawData.V) || 0,
            I: parseFloat(rawData.I) || 0,
            hdop: parseInt(rawData.hd) || 0,
            satelit: parseInt(rawData.st) || 0,
            ts: rawData.ts || 0,
            status_mesin: parseFloat(rawData.V) >= 12.8 ? 'ON' : 'OFF'
        };

        console.log(`[LIVE MODE] ID:${data.id} | Koor: ${data.lat}, ${data.long} | Aki:${data.V}V | HDOP:${data.hdop}`);

        // 1. Update Status Inti
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

        // 3. Simpan Riwayat Telemetri
        if (data.status_mesin === 'ON') {
            const queryTelemetri = `
                INSERT INTO riwayat_telemetri (alsintan_id, tegangan_aki, arus, waktu_rekam) 
                VALUES ($1, $2, $3, NOW())
            `;
            db.query(queryTelemetri, [data.id, data.V, data.I]);
        }

        // ================================================================
        // ⏱️ LOGIKA PERHITUNGAN HOUR METER (NEW)
        // ================================================================
        if (data.status_mesin === 'ON') {
            const now = Date.now();
            
            // Jika traktor ini sudah pernah mengirim pesan sebelumnya
            if (lastPingTime[data.id]) {
                const diffMs = now - lastPingTime[data.id]; // Hitung selisih waktu dalam milidetik
                
                // Safety Limit: Abaikan jika selisih waktu tidak wajar (misal internet mati 1 jam)
                if (diffMs > 0 && diffMs < 300000) { // Max 5 menit
                    const diffHours = diffMs / 3600000; // Konversi milidetik ke satuan Jam (Hour)
                    hmAccumulator[data.id] = (hmAccumulator[data.id] || 0) + diffHours; // Masukkan ke celengan
                }
            }
            lastPingTime[data.id] = now; // Perbarui catatan waktu terakhir
        } else {
            // Jika mesin mati, hapus catatan waktunya agar tidak melompat saat dinyalakan lagi
            delete lastPingTime[data.id];
        }

        // ================================================================
        // 📥 BUFFER JALUR LAMBAT (PENGHITUNGAN LAHAN)
        // ================================================================
        if (data.status_mesin === 'ON') {
            if (!tractorBuffers[data.id]) {
                tractorBuffers[data.id] = {
                    lastValidLat: data.lat,
                    lastValidLong: data.long,
                    lastTime: Date.now(),
                    queue: []
                };
            }
            tractorBuffers[data.id].queue.push({
                lat: data.lat,
                long: data.long,
                hdop: data.hdop,
                time: Date.now()
            });
        } else {
            if (tractorBuffers[data.id]) {
                delete tractorBuffers[data.id];
            }
        }

    } catch (error) {}
});

// ========================================================================
// ⚙️ BACKGROUND WORKER (SETORAN DB SETIAP 10 DETIK)
// ========================================================================
setInterval(() => {
    
    // --- 1. SETORAN HOUR METER ---
    Object.keys(hmAccumulator).forEach(id_alat => {
        const hoursToAdd = hmAccumulator[id_alat];
        if (hoursToAdd > 0) {
            // COALESCE digunakan untuk berjaga-jaga jika nilai di database adalah NULL, maka dianggap 0
            const queryAddHM = `UPDATE monitoring_status SET total_hour_meter = COALESCE(total_hour_meter, 0) + $1 WHERE alsintan_id = $2`;
            db.query(queryAddHM, [hoursToAdd, id_alat]);
            
            // Kosongkan celengan setelah disetor ke database
            hmAccumulator[id_alat] = 0; 
        }
    });

    // --- 2. SETORAN JARAK KERJA (GPS DRIFT) ---
    Object.keys(tractorBuffers).forEach(id_alat => {
        const buffer = tractorBuffers[id_alat];

        if (buffer.queue.length === 0) return; 

        let validDistanceToDB = 0;
        const validPointsToInsert = [];

        buffer.queue.forEach(point => {
            const rawDist = calculateDistance(buffer.lastValidLat, buffer.lastValidLong, point.lat, point.long);
            
            let timeDiffSec = (point.time - buffer.lastTime) / 1000;
            if (timeDiffSec <= 0) timeDiffSec = 1;
            
            const speedKmh = (rawDist / timeDiffSec) * 3.6;
            let isDrift = false;

            if (speedKmh > 20) {
                isDrift = true; 
            } else if (rawDist < 1.0) { 
                isDrift = true; 
            } else if (point.hdop > 250 && rawDist > 3.0) {
                isDrift = true; 
            }

            if (!isDrift) {
                const ALPHA = 0.4; 
                const finalLat = (ALPHA * point.lat) + ((1 - ALPHA) * buffer.lastValidLat);
                const finalLong = (ALPHA * point.long) + ((1 - ALPHA) * buffer.lastValidLong);

                const smoothedDist = calculateDistance(buffer.lastValidLat, buffer.lastValidLong, finalLat, finalLong);

                validDistanceToDB += smoothedDist;
                validPointsToInsert.push({ lat: finalLat, long: finalLong });

                buffer.lastValidLat = finalLat;
                buffer.lastValidLong = finalLong;
                buffer.lastTime = point.time; 
            } 
        });

        buffer.queue = [];

        if (validPointsToInsert.length > 0) {
            db.query(`UPDATE monitoring_status SET total_jarak_kerja = COALESCE(total_jarak_kerja, 0) + $1 WHERE alsintan_id = $2`,
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