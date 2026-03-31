const mqtt = require('mqtt');
const db = require('../config/database');

// FUNGSI HITUNG JARAK (Haversine Formula) - Tidak perlu diubah
function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371e3; // Radius bumi dalam meter
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
}

const BROKER_URL = process.env.MQTT_BROKER;
const TOPIC = process.env.MQTT_TOPIC;


const client = mqtt.connect(BROKER_URL);

client.on('connect', () => {
    console.log(`✅ Backend IoT Service Terhubung: ${BROKER_URL}`);
    client.subscribe(TOPIC);
});

client.on('message', (topic, message) => {
    try {
        const rawData = JSON.parse(message.toString());

        // 🛠️ TAHAP ADAPTER: Menerjemahkan bahasa IoT Asli ke bahasa Database
        const data = {
            // Jika alat tidak kirim ID, kita paksa menjadi ID 2 (Silakan sesuaikan dengan ID traktor Anda di DB)
            id_alat: rawData.id_alat || 2, 
            
            // Logika Cerdas: Jika tegangan aki > 5V, anggap mesin ON. Jika tidak ada tegangan, default 'ON' sementara.
            status_mesin: rawData.status_mesin || (rawData.voltage > 0 ? 'ON' : 'OFF'), 
            
            lat: rawData.lat,
            
            // Baca "lng" dari IoT asli, atau "long" dari simulator
            long: rawData.lng || rawData.long, 
            
            voltage: rawData.voltage || 0
        };

        // 🛡️ TAHAP FILTER KEAMANAN: Jangan proses jika GPS belum Lock!
        // Mencegah koordinat (0, 0) masuk dan merusak tampilan peta.
        // if (!data.lat || !data.long || (data.lat === 0 && data.long === 0)) {
        //     console.log(`⏳ [ID:${data.id_alat}] Sinyal GPS belum Lock. Data lokasi diabaikan sementara...`);
        //     return; 
        // }

        console.log(`📡 Data Asli Masuk [ID:${data.id_alat} | Mesin:${data.status_mesin} | Voltase:${data.voltage}V]`);

        // LANGKAH 1: Ambil data posisi TERAKHIR
        const queryLastPos = `SELECT latitude, longitude FROM alsintan WHERE alsintan_id = $1`;
        
        db.query(queryLastPos, [data.id_alat], (err, result) => {
            if (err) return console.error('DB Error (Select):', err.message);

            let tambahanJarak = 0;
            
            if (result.rows.length > 0 && data.status_mesin === 'ON') {
                const lastLat = result.rows[0].latitude;
                const lastLong = result.rows[0].longitude;

                const dist = calculateDistance(lastLat, lastLong, data.lat, data.long);
                
                if (dist > 0.5) {
                    tambahanJarak = dist;
                }
            }

            // LANGKAH 2: Update Tabel monitoring_status
            const queryUpdateStatus = `
                UPDATE monitoring_status 
                SET 
                    status_mesin = $1, 
                    last_heartbeat = NOW(),
                    total_jarak_kerja = total_jarak_kerja + $2
                WHERE alsintan_id = $3
            `;
            db.query(queryUpdateStatus, [data.status_mesin, tambahanJarak, data.id_alat], (errStat) => {
                if (errStat) console.error('Gagal update status:', errStat.message);
            });

            // LANGKAH 3: Update Cache Lokasi di Tabel alsintan
            const queryUpdatePos = `UPDATE alsintan SET latitude = $1, longitude = $2 WHERE alsintan_id = $3`;
            db.query(queryUpdatePos, [data.lat, data.long, data.id_alat], (errPos) => {
                if (errPos) console.error('Gagal update posisi:', errPos.message);
            });

            // LANGKAH 4: Simpan Jejak (History) - HANYA JIKA MESIN ON
            if (data.status_mesin === 'ON') {
                const queryHistory = `
                    INSERT INTO riwayat_perjalanan (alsintan_id, latitude, longitude, waktu_rekam) 
                    VALUES ($1, $2, $3, NOW())
                `;
                db.query(queryHistory, [data.id_alat, data.lat, data.long], (errHist) => {
                    if (errHist) console.error('Gagal simpan riwayat:', errHist.message);
                });
            }
        });

    } catch (error) {
        console.error('Format data JSON dari IoT salah:', error.message);
    }
});

module.exports = client;