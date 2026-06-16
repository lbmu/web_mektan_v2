const mqtt = require('mqtt');
const db = require('../config/database');

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

const tractorBuffers = {};
const hmAccumulator = {}; 
const lastPingTime = {};  
const tractorStatus = {}; 

client.on('connect', () => {
    console.log(`✅ Backend Terhubung! (Filter Stationary & Precision Timestamp Aktif)`);
    client.subscribe(TOPIC);
});

client.on('error', (err) => console.error('❌ MQTT Error:', err.message));
client.on('reconnect', () => console.log('🔄 Menyambung ulang...'));
client.on('offline', () => console.log('⚠️ Terputus dari broker MQTT.'));

client.on('message', (topic, message) => {
    try {
        const rawData = JSON.parse(message.toString());
        const vAki = parseFloat(rawData.V) || 0;

        // Safety Filter: Abaikan koordinat 0,0 (Null Island) yang merusak peta
        if (!rawData.lat || !rawData.lng || rawData.lat === 0 || rawData.lng === 0) return;

        let currentStatus = tractorStatus[rawData.id] || 'OFF'; 

        if (vAki > 13.4) {
            currentStatus = 'ON';
        } else if (vAki < 13.0) {
            currentStatus = 'OFF';
        }

        tractorStatus[rawData.id] = currentStatus;

        const data = {
            id: rawData.id, 
            lat: parseFloat(rawData.lat),
            long: parseFloat(rawData.lng), 
            V: vAki,
            I: parseFloat(rawData.I) || 0,
            hdop: parseInt(rawData.hd) || 0,
            satelit: parseInt(rawData.st) || 0,
            ts: rawData.ts || 0,
            status_mesin: currentStatus 
        };

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

        db.query(`UPDATE alsintan SET latitude = $1, longitude = $2 WHERE alsintan_id = $3`, [data.lat, data.long, data.id]);

        const queryTelemetri = `
            INSERT INTO riwayat_telemetri (alsintan_id, tegangan_aki, arus, waktu_rekam) 
            VALUES ($1, $2, $3, NOW())
        `;
        db.query(queryTelemetri, [data.id, data.V, data.I]);

        if (data.status_mesin === 'ON') {
            const now = Date.now();
            if (lastPingTime[data.id]) {
                const diffMs = now - lastPingTime[data.id]; 
                if (diffMs > 0 && diffMs < 300000) { 
                    const diffHours = diffMs / 3600000; 
                    hmAccumulator[data.id] = (hmAccumulator[data.id] || 0) + diffHours; 
                }
            }
            lastPingTime[data.id] = now; 
        } else {
            delete lastPingTime[data.id];
        }

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
            time: Date.now(),
            status: data.status_mesin
        });

    } catch (error) {}
});

setInterval(() => {
    Object.keys(hmAccumulator).forEach(id_alat => {
        const hoursToAdd = hmAccumulator[id_alat];
        if (hoursToAdd > 0) {
            const queryAddHM = `UPDATE monitoring_status SET total_hour_meter = COALESCE(total_hour_meter, 0) + $1 WHERE alsintan_id = $2`;
            db.query(queryAddHM, [hoursToAdd, id_alat]);
            hmAccumulator[id_alat] = 0; 
        }
    });

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

            // [BUG FIX]: PEMISAHAN LOGIKA DRIFT (Spike) DAN PARKIR (Stationary)
            let isSpike = false;
            let isStationary = false;

            if (speedKmh > 20) {
                isSpike = true; 
            } else if (point.hdop > 250 && rawDist > 3.0) {
                isSpike = true; 
            } else if (rawDist < 1.0) {
                // Jarak kurang dari 1 meter berarti traktor sedang parkir/ditarik diam
                isStationary = true; 
            }

            if (!isSpike) {
                let finalLat = point.lat;
                let finalLong = point.long;
                let smoothedDist = 0;

                if (!isStationary) {
                    const ALPHA = 0.8; 
                    finalLat = (ALPHA * point.lat) + ((1 - ALPHA) * buffer.lastValidLat);
                    finalLong = (ALPHA * point.long) + ((1 - ALPHA) * buffer.lastValidLong);
                    smoothedDist = calculateDistance(buffer.lastValidLat, buffer.lastValidLong, finalLat, finalLong);
                    
                    buffer.lastValidLat = finalLat;
                    buffer.lastValidLong = finalLong;
                } else {
                    // Jika parkir, pastikan titiknya tertahan agar map UI tidak bergetar (Jitter)
                    finalLat = buffer.lastValidLat;
                    finalLong = buffer.lastValidLong;
                }

                if (point.status === 'ON') {
                    validDistanceToDB += smoothedDist;
                }

                // KUNCI PERBAIKAN TIMESTAMPS: Kita menyertakan point.time ke antrean DB
                validPointsToInsert.push({ lat: finalLat, long: finalLong, status: point.status, time: point.time });
                buffer.lastTime = point.time; 
            } 
        });

        buffer.queue = [];

        if (validDistanceToDB > 0) {
            db.query(`UPDATE monitoring_status SET total_jarak_kerja = COALESCE(total_jarak_kerja, 0) + $1 WHERE alsintan_id = $2`,
                    [validDistanceToDB, id_alat]);
        }

        if (validPointsToInsert.length > 0) {
            validPointsToInsert.forEach(vp => {
                // KUNCI PERBAIKAN URUTAN (Race Condition): Menggunakan presisi milidetik dari Node.js (vp.time)
                db.query(`INSERT INTO riwayat_perjalanan (alsintan_id, latitude, longitude, waktu_rekam, status_mesin) VALUES ($1, $2, $3, TO_TIMESTAMP($4 / 1000.0), $5)`,
                        [id_alat, vp.lat, vp.long, vp.time, vp.status]);
            });
        }
    });
}, 10000);

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
            console.log(`⚠️ [WATCHDOG] ${result.rowCount} traktor kehilangan sinyal (>10 menit).`);
        }
    });
}, 60000);

module.exports = client;