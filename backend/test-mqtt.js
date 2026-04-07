const mqtt = require('mqtt');

// 1. Tulis langsung tanpa menggunakan .env
const host = "HOST_ANDA_DISINI.s1.eu.hivemq.cloud"; // Pastikan TANPA spasi, TANPA mqtts://
const username = "simon_alsintan";
const password = "PASSWORD_ANDA_DISINI";

// 2. GAYA PENULISAN RESMI HIVEMQ CLOUD (Menggabungkan URL secara langsung)
const connectUrl = `mqtts://${host.trim()}:8883`;

console.log(`🚀 Mengirim roket ke: ${connectUrl}...`);

// 3. Opsi minimalis
const options = {
    username: username.trim(),
    password: password.trim(),
    clientId: 'detektif_mektan_' + Math.random().toString(16).substring(2, 8),
    rejectUnauthorized: true
};

const client = mqtt.connect(connectUrl, options);

client.on('connect', () => {
    console.log("✅ BINGO! Berhasil Terhubung! Teori SNI/Format URL terbukti benar.");
    process.exit(0);
});

client.on('error', (err) => {
    console.error("❌ MASIH DITOLAK:", err.message);
    process.exit(1);
});