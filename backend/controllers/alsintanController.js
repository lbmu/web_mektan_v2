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
        // PERUBAHAN POSTGRES: Gunakan results.rows
        res.status(200).json(results.rows);
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
        WHERE a.alsintan_id = $1
    `;

    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        // PERUBAHAN POSTGRES: Gunakan results.rows
        if (results.rows.length === 0) return res.status(404).json({ pesan : 'Data alat tidak tersedia'});
        res.status(200).json(results.rows[0]);
    });
};

// 3. CREATE
exports.createAlsintan = (req, res) => {
    const {
        kode_perangkat, nama_alat, kategori_alat, merk_alat, nomor_seri,
        status_sensor, status_operasional, deskripsi, kapasitas_lahan,
    } = req.body;

    const gambar = req.file ? req.file.filename : 'default.jpg';

    if (!kode_perangkat || !nama_alat) {
        return res.status(400).json({ pesan: 'Kode perangkat dan nama alat harus diisi' });
    }


    const queryAlat = `
        INSERT INTO alsintan (
            kode_perangkat, nama_alat, kategori_alat, merk_alat, nomor_seri, 
            status, status_sensor, status_operasional, deskripsi, kapasitas_lahan, gambar
        ) VALUES ($1, $2, $3, $4, $5, 'OFF', $6, $7, $8, $9, $10)
        RETURNING alsintan_id
    `;

    const values = [
        kode_perangkat, nama_alat, kategori_alat, merk_alat, nomor_seri,
        status_sensor, status_operasional, deskripsi, kapasitas_lahan, gambar
    ];

    db.query(queryAlat, values, (err, result) => {
        if (err) {

            if (err.code === '23505') {
                return res.status(400).json({ pesan: 'Kode perangkat sudah terdaftar' });
            }
            return res.status(500).json({ pesan: 'Gagal insert alsintan', error: err.message });
        }


        const newId = result.rows[0].alsintan_id;

        // PERUBAHAN POSTGRES: INSERT IGNORE diganti ON CONFLICT DO NOTHING
        const queryStatus = `
            INSERT INTO monitoring_status (alsintan_id, status_mesin) 
            VALUES ($1, 'OFF') 
            ON CONFLICT (alsintan_id) DO NOTHING
        `;
        
        db.query(queryStatus, [newId], (errStatus) => {
            if (errStatus) console.error("Gagal init status:", errStatus);
            
            res.status(201).json({
                pesan: 'Berhasil menambahkan alsintan baru!',
                data: { id: newId, ...req.body }
            });
        });
    });
};

// 4. UPDATE
exports.updateAlsintan = (req, res) => {
    const id = req.params.id;
    const {
        kode_perangkat, nama_alat, kategori_alat, merk_alat, nomor_seri, 
        status_sensor, status_operasional, deskripsi, kapasitas_lahan
    } = req.body;
    

    let query = `
        UPDATE alsintan SET
            kode_perangkat = $1, nama_alat = $2, kategori_alat = $3, merk_alat = $4,
            nomor_seri = $5, status_sensor = $6, status_operasional = $7,
            deskripsi = $8, kapasitas_lahan = $9
    `;

    let values = [
        kode_perangkat, nama_alat, kategori_alat, merk_alat, nomor_seri, 
        status_sensor, status_operasional, deskripsi, kapasitas_lahan
    ]; 
    let paramCounter = 10;

    if (req.file) {
        query += `, gambar = $${paramCounter} `;
        values.push(req.file.filename);
        paramCounter++;
    }   

    query += ` WHERE alsintan_id = $${paramCounter}`;
    values.push(id);
    
    db.query(query, values, (err, result) => {
        if (err) return res.status(500).json({ pesan: 'Gagal update data', error: err.message });
        res.status(200).json({ pesan: 'Data alsintan berhasil diperbarui'});
    });
};

// 5. GET RIWAYAT (DENGAN FILTER TANGGAL)
exports.getRiwayat = (req, res) => {
    const id = req.params.id;
    const tanggal = req.query.tanggal; // Menangkap filter tanggal dari Frontend

    // JIKA ADA FILTER TANGGAL (Mode Riwayat)
    if (tanggal) {
        // Query Postgres untuk mencocokkan tanggal (abaikan jam)
        const queryHistory = `
            SELECT latitude, longitude, waktu_rekam 
            FROM riwayat_perjalanan 
            WHERE alsintan_id = $1 AND DATE(waktu_rekam) = $2 
            ORDER BY waktu_rekam ASC
        `;
        db.query(queryHistory, [id, tanggal], (errHist, results) => {
            if (errHist) return res.status(500).json({ error: errHist.message });
            res.json(results.rows);
        });
        return; // Hentikan fungsi di sini
    }

    // JIKA TIDAK ADA TANGGAL (Mode Live - Tarik data sejak waktu_reset)
    const queryCheck = `SELECT waktu_reset FROM alsintan WHERE alsintan_id = $1`;
    db.query(queryCheck, [id], (err, rowsResult) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let queryHistory = "";
        let params = [id];

        if (rowsResult.rows.length > 0 && rowsResult.rows[0].waktu_reset) {
            queryHistory = `SELECT latitude, longitude, waktu_rekam FROM riwayat_perjalanan WHERE alsintan_id = $1 AND waktu_rekam >= $2 ORDER BY waktu_rekam ASC`;
            params.push(rowsResult.rows[0].waktu_reset);
        } else {
            queryHistory = `SELECT latitude, longitude, waktu_rekam FROM riwayat_perjalanan WHERE alsintan_id = $1 ORDER BY waktu_rekam ASC`;
        }

        db.query(queryHistory, params, (errHist, results) => {
            if (errHist) return res.status(500).json({ error: errHist.message });
            res.json(results.rows); // PERUBAHAN POSTGRES: Gunakan results.rows
        });
    });
};

// 6. RESET ARGO
exports.resetArgo = (req, res) => {
    const id = req.params.id;
    const queryResetTime = `UPDATE alsintan SET waktu_reset = NOW() WHERE alsintan_id = $1`;
    const queryResetMetric = `UPDATE monitoring_status SET total_jarak_kerja = 0 WHERE alsintan_id = $1`;

    db.query(queryResetTime, [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        db.query(queryResetMetric, [id], (errMetric) => {
            if (errMetric) return res.status(500).json({ error: errMetric.message });
            res.json({ message: 'Argo dan Sesi berhasil di-reset.' });
        });
    });
};