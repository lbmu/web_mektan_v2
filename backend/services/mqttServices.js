const mqtt = require('mqtt');
const db = require('../config/database');

const BROKER_URL = 'mqtt://broker.hivemq.com';

const TOPIC = 'project-mektan/v1/data';

const client = mqtt.connect(BROKER_URL);

client.on('connect', () => {
    console.log(`✅ Terhubung ke MQTT Broker: ${BROKER_URL}`);

    client.subscribe(TOPIC, (err) => {
        if (!err) {
            console.log(`✅ Berhasil berlangganan ke topik: ${TOPIC}`);
        }
    });
});

client.on('message', (topic, message) => {
    try {
        const data = JSON.parse(message.toString());

        console.log(`📍 Data Masuk ID ${data.id_alat}:`, data.lat, data.long);

        const queryHistory = `INSERT INTO riwayat_perjalanan (alsintan_id, latitude, longitude) VALUES (?, ?, ?)`;
        db.query(queryHistory, [data.id_alat, data.lat, data.long], (err) => {
            if (err) console.error('❌ Gagal menyimpan riwayat perjalanan:', err.message);
        });

        const queryUpdate = `UPDATE alsintan SET latitude = ?, longitude = ? WHERE alsintan_id = ?`;
        db.query(queryUpdate, [data.lat, data.long, data.id_alat], (err) => {
            if (err) console.error('❌ Gagal memperbarui posisi alsintan:', err.message);
        });
    } catch (error) {
        console.error('❌ Gagal memproses pesan MQTT:', error.message);
    }
});

module.exports = client;