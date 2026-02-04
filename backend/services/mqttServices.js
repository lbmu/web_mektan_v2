const mqtt = require('mqtt');
const db = require('../config/database');

// FUNGSI HITUNG JARAK (Haversine Formula) - Manual di JS karena MySQL versi lama kadang ribet
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

const BROKER_URL = 'mqtt://broker.hivemq.com';

const TOPIC = 'project-mektan/v1/data';

const client = mqtt.connect(BROKER_URL);

client.on('connect', () => {
    console.log(`✅ Backend IoT Service Terhubung: ${BROKER_URL}`);
    client.subscribe(TOPIC);
});

client.on('message', (topic, message) => {
    try {
        // Data masuk diharapkan: { "id_alat": 1, "lat": -6.xxx, "long": 107.xxx, "status_mesin": "ON", "speed": 10 }
        const data = JSON.parse(message.toString());
        console.log(`📡 Data Masuk [ID:${data.id_alat} | Mesin:${data.status_mesin}]`);

        // LANGKAH 1: Ambil data posisi TERAKHIR dari database (Untuk hitung selisih jarak)
        const queryLastPos = `SELECT latitude, longitude FROM alsintan WHERE alsintan_id = ?`;
        
        db.query(queryLastPos, [data.id_alat], (err, rows) => {
            if (err) return console.error('DB Error:', err);

            // Variabel hitungan
            let tambahanJarak = 0;
            
            // LOGIC GATE: Hitung jarak HANYA JIKA Mesin ON
            if (rows.length > 0 && data.status_mesin === 'ON') {
                const lastLat = rows[0].latitude;
                const lastLong = rows[0].longitude;

                // Hitung jarak dari titik sebelumnya ke titik sekarang
                const dist = calculateDistance(lastLat, lastLong, data.lat, data.long);
                
                // Filter Noise: Anggap bergerak jika pindah > 0.5 meter (agar GPS goyang diam tidak dihitung)
                if (dist > 0.5) {
                    tambahanJarak = dist;
                }
            }

            // LANGKAH 2: Update Tabel monitoring_status (Telemetri)
            // Kita update status_mesin, heartbeat, dan akumulasi jarak kerja
            const queryUpdateStatus = `
                UPDATE monitoring_status 
                SET 
                    status_mesin = ?, 
                    last_heartbeat = NOW(),
                    total_jarak_kerja = total_jarak_kerja + ?
                WHERE alsintan_id = ?
            `;

            db.query(queryUpdateStatus, [data.status_mesin, tambahanJarak, data.id_alat], (errStat) => {
                if (errStat) console.error('Gagal update status:', errStat.message);
            });

            // LANGKAH 3: Update Cache Lokasi di Tabel alsintan (Agar Dashboard cepat)
            const queryUpdatePos = `UPDATE alsintan SET latitude = ?, longitude = ? WHERE alsintan_id = ?`;
            db.query(queryUpdatePos, [data.lat, data.long, data.id_alat]);

            // LANGKAH 4: Simpan Jejak (History) - Tetap simpan walau OFF (untuk pelacakan transport)
            const queryHistory = `INSERT INTO riwayat_perjalanan (alsintan_id, latitude, longitude) VALUES (?, ?, ?)`;
            db.query(queryHistory, [data.id_alat, data.lat, data.long]);
        });

    } catch (error) {
        console.error('Format data JSON salah:', error.message);
    }
});

module.exports = client;