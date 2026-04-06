-- DDL untuk Database Si-Alsintan

-- 1. Tabel Users (Untuk Login & RBAC)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nama VARCHAR(150),
    role VARCHAR(20) DEFAULT 'admin', -- 'super_admin' atau 'admin'
    foto_profil TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert 1 Akun Super Admin Default (Password silakan di-hash/sesuaikan nanti)
INSERT INTO users (username, password, nama, role) VALUES ('developer', 'dev123', 'Super Admin IoT', 'super_admin');

-- 2. Tabel Alsintan (Aset Traktor/Alat)
CREATE TABLE alsintan (
    alsintan_id SERIAL PRIMARY KEY,
    kode_perangkat VARCHAR(100) UNIQUE, -- ID dari modul ESP32
    nama_alat VARCHAR(255),
    kategori_alat VARCHAR(100),
    merk_alat VARCHAR(100),
    nomor_seri VARCHAR(100),
    status VARCHAR(50),
    status_sensor VARCHAR(50),
    status_operasional VARCHAR(50),
    deskripsi TEXT,
    kapasitas_lahan VARCHAR(100),
    gambar TEXT,
    waktu_reset TIMESTAMP,
    latitude NUMERIC(10,8) DEFAULT 0,
    longitude NUMERIC(11,8) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel Monitoring Status
CREATE TABLE monitoring_status (
    id SERIAL PRIMARY KEY,
    alsintan_id INTEGER REFERENCES alsintan(alsintan_id) ON DELETE CASCADE,
    status_mesin VARCHAR(10) DEFAULT 'OFF',
    last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_jarak_kerja NUMERIC(10,2) DEFAULT 0
);

-- 4. Tabel Riwayat Perjalanan (Jejak GPS)
CREATE TABLE riwayat_perjalanan (
    id SERIAL PRIMARY KEY,
    alsintan_id INTEGER REFERENCES alsintan(alsintan_id) ON DELETE CASCADE,
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    waktu_rekam TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);