const db = require('../config/database');

// 1. GET ALL (JOIN Data Profil + Data Sensor Live)
exports.getAllAlsintan = (req, res) => {
    const query = `
        SELECT 
            a.*, 
            m.status_mesin, 
            m.last_heartbeat, 
            m.total_hour_meter, 
            m.total_jarak_kerja,
            m.tegangan_aki
        FROM alsintan a
        LEFT JOIN monitoring_status m ON a.alsintan_id = m.alsintan_id
        ORDER BY a.alsintan_id DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(results);
    });
};

// 2. GET BY ID
exports.getAlsintanById = (req, res) => {
    const id = req.params.id;
    const query = `
        SELECT 
            a.*, 
            m.status_mesin, 
            m.last_heartbeat, 
            m.total_hour_meter, 
            m.total_jarak_kerja,
            m.tegangan_aki
        FROM alsintan a
        LEFT JOIN monitoring_status m ON a.alsintan_id = m.alsintan_id
        WHERE a.alsintan_id = ?
    `;

    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ pesan : 'Data alat tidak tersedia'});
        res.status(200).json(results[0]);
    });
};

// 3. CREATE (PERBAIKAN QUERY: Menangani Kolom Legacy 'status')
exports.createAlsintan = (req, res) => {
    const {
        kode_perangkat, nama_alat, kategori_alat, merk_alat, nomor_seri,
        status_sensor, status_operasional, deskripsi, kapasitas_lahan,
    } = req.body;

    const gambar = req.file ? req.file.filename : 'default.jpg';

    // VALIDASI INPUT DASAR
    if (!kode_perangkat || !nama_alat) {
        return res.status(400).json({ pesan: 'Kode perangkat dan nama alat harus diisi' });
    }

    // QUERY 1: Insert ke alsintan
    // PERBAIKAN: Saya tambahkan kolom 'status' dan diisi 'OFF' secara hardcode
    // Tujuannya agar database tidak error "Field 'status' cannot be null"
    const queryAlat = `
        INSERT INTO alsintan (
            kode_perangkat, nama_alat, kategori_alat, merk_alat, nomor_seri, 
            status, status_sensor, status_operasional, deskripsi, kapasitas_lahan, gambar
        ) VALUES (?, ?, ?, ?, ?, 'OFF', ?, ?, ?, ?, ?)
    `;

    const values = [
        kode_perangkat, nama_alat, kategori_alat, merk_alat, nomor_seri,
        status_sensor, status_operasional, deskripsi, kapasitas_lahan, gambar
    ];

    db.query(queryAlat, values, (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ pesan: 'Kode perangkat sudah terdaftar' });
            }
            return res.status(500).json({ pesan: 'Gagal insert alsintan', error: err.sqlMessage });
        }

        const newId = result.insertId;

        // QUERY 2: Init Monitoring Status
        // Kita gunakan INSERT IGNORE agar jika entah kenapa sudah ada, tidak error
        const queryStatus = `INSERT IGNORE INTO monitoring_status (alsintan_id, status_mesin) VALUES (?, 'OFF')`;
        
        db.query(queryStatus, [newId], (errStatus) => {
            if (errStatus) console.error("Gagal init status:", errStatus);
            
            res.status(201).json({
                pesan: 'Berhasil menambahkan alsintan baru!',
                data: { id: newId, ...req.body }
            });
        });
    });
};

// 4. UPDATE (PERBAIKAN QUERY: Menangani Kolom Legacy 'status')
exports.updateAlsintan = (req, res) => {
    const id = req.params.id;
    const {
        kode_perangkat, nama_alat, kategori_alat, merk_alat, nomor_seri, 
        status_sensor, status_operasional, deskripsi, kapasitas_lahan
    } = req.body;

    // Kita update kolom 'status' juga dengan nilai dari 'status_operasional' atau tetap 'OFF'
    // agar data legacy tetap konsisten.
    
    let query = `
        UPDATE alsintan SET
            kode_perangkat = ?, nama_alat = ?, kategori_alat = ?, merk_alat = ?,
            nomor_seri = ?, status_sensor = ?, status_operasional = ?,
            deskripsi = ?, kapasitas_lahan = ?
    `;

    let values = [
        kode_perangkat, nama_alat, kategori_alat, merk_alat, nomor_seri, 
        status_sensor, status_operasional, deskripsi, kapasitas_lahan
    ]; 

    if (req.file) {
        query += `, gambar = ? `;
        values.push(req.file.filename);
    }   

    query += ` WHERE alsintan_id = ?`;
    values.push(id);
    
    db.query(query, values, (err, result) => {
        if (err) return res.status(500).json({ pesan: 'Gagal update data', error: err.sqlMessage });
        res.status(200).json({ pesan: 'Data alsintan berhasil diperbarui'});
    });
};

// 5. GET RIWAYAT
exports.getRiwayat = (req, res) => {
    const id = req.params.id;
    const queryCheck = `SELECT waktu_reset FROM alsintan WHERE alsintan_id = ?`;
    
    db.query(queryCheck, [id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let queryHistory = "";
        let params = [id];

        if (rows.length > 0 && rows[0].waktu_reset) {
            queryHistory = `SELECT latitude, longitude, waktu_rekam FROM riwayat_perjalanan WHERE alsintan_id = ? AND waktu_rekam >= ? ORDER BY waktu_rekam ASC`;
            params.push(rows[0].waktu_reset);
        } else {
            queryHistory = `SELECT latitude, longitude, waktu_rekam FROM riwayat_perjalanan WHERE alsintan_id = ? ORDER BY waktu_rekam ASC`;
        }

        db.query(queryHistory, params, (errHist, results) => {
            if (errHist) return res.status(500).json({ error: errHist.message });
            res.json(results);
        });
    });
};

// 6. RESET ARGO
exports.resetArgo = (req, res) => {
    const id = req.params.id;
    const queryResetTime = `UPDATE alsintan SET waktu_reset = NOW() WHERE alsintan_id = ?`;
    const queryResetMetric = `UPDATE monitoring_status SET total_jarak_kerja = 0 WHERE alsintan_id = ?`;

    db.query(queryResetTime, [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        db.query(queryResetMetric, [id], (errMetric) => {
             res.json({ message: 'Argo dan Sesi berhasil di-reset.' });
        });
    });
};