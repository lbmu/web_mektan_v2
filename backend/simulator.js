const mqtt = require('mqtt');

// 1. KONFIGURASI
const BROKER_URL = 'mqtt://broker.hivemq.com';

const TOPIC = 'project-mektan/v1/data'; 

const ID_ALAT = 20; 

// 2. KONEKSI
const client = mqtt.connect(BROKER_URL);

// Koordinat Awal (CONTOH)
let lat = -6.974001; 
let long = 107.630001;

client.on('connect', () => {
    console.log(`🚜 Traktor Simulator Siap! Terhubung ke ${BROKER_URL}`);
    
    // 3. MULAI MENGIRIM DATA SETIAP 5 DETIK
    setInterval(() => {
        // Simulasi pergerakan (geser dikit-dikit)
        lat += 0.0001; // Bergerak ke utara
        long += 0.0001; // Bergerak ke timur

        // Format data JSON
        const data = {
            id_alat: ID_ALAT,
            lat: lat.toFixed(6),
            long: long.toFixed(6)
        };

        const payload = JSON.stringify(data);
        
        // Kirim ke Topik
        client.publish(TOPIC, payload);
        console.log(`📤 Mengirim data: Lat ${data.lat}, Long ${data.long}`);

    }, 1000); // 5000 ms = 5 detik
});