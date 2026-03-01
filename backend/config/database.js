const { Pool } = require('pg');

const db = new Pool({
    host: 'localhost',
    user: 'postgres',
    password: 'postgres',
    database: 'db_alsintan',
    port: 5432,
});

db.connect((err, client, release) => {
    if (err) {
        console.error('❌ Gagal koneksi ke database PostgreSQL:', err.stack);
    } else {
        console.log('✅ Berhasil koneksi ke database PostgreSQL (db_alsintan)');
        release(); 
    }
});

module.exports = db;