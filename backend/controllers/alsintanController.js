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
        if (results.rows.length === 0) return res.status(404).json({ pesan : 'Data alat tidak tersedia'});
        res.status(200).json(results.rows[0]);
    });
};

// 3. CREATE
exports.createAlsintan = (req, res) => {
    const {
        kode_perangkat, nama_alat, kategori_alat, merk_alat, nomor_seri,
        status_sensor, status_operasional, deskripsi, kapasitas_lahan, lebar_implemen
    } = req.body;

    const gambar = req.file ? req.file.path : 'default.jpg';

    if (!kode_perangkat || !nama_alat) {
        return res.status(400).json({ pesan: 'Kode perangkat dan nama alat harus diisi' });
    }

    const queryAlat = `
        INSERT INTO alsintan (
            kode_perangkat, nama_alat, kategori_alat, merk_alat, nomor_seri, 
            status, status_sensor, status_operasional, deskripsi, kapasitas_lahan, lebar_implemen, gambar
        ) VALUES ($1, $2, $3, $4, $5, 'OFF', $6, $7, $8, $9, $10, $11)
        RETURNING alsintan_id
    `;

    const values = [
        kode_perangkat, nama_alat, kategori_alat, merk_alat, nomor_seri,
        status_sensor, status_operasional, deskripsi, kapasitas_lahan, 
        lebar_implemen || 1.89, gambar
    ];

    db.query(queryAlat, values, (err, result) => {
        if (err) {
            if (err.code === '23505') {
                return res.status(400).json({ pesan: 'Kode perangkat sudah terdaftar' });
            }
            return res.status(500).json({ pesan: 'Gagal insert alsintan', error: err.message });
        }

        const newId = result.rows[0].alsintan_id;

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
        status_sensor, status_operasional, deskripsi, kapasitas_lahan, lebar_implemen
    } = req.body;
    
    db.query(`SELECT gambar FROM alsintan WHERE alsintan_id = $1`, [id], (errCheck, rowsResult) => {
        if (errCheck) return res.status(500).json({ pesan: 'Gagal mengecek data lama', error: errCheck.message });

        let query = `
            UPDATE alsintan SET
                kode_perangkat = $1, nama_alat = $2, kategori_alat = $3, merk_alat = $4,
                nomor_seri = $5, status_sensor = $6, status_operasional = $7,
                deskripsi = $8, kapasitas_lahan = $9, lebar_implemen = $10
        `;

        let values = [
            kode_perangkat, nama_alat, kategori_alat, merk_alat, nomor_seri, 
            status_sensor, status_operasional, deskripsi, kapasitas_lahan, 
            lebar_implemen || 1.89
        ]; 
        
        let paramCounter = 11;

        if (req.file) {
            console.log("📸 Gambar Traktor sukses diunggah ke Cloudinary:", req.file.path);
            query += `, gambar = $${paramCounter} `;
            values.push(req.file.path);
            paramCounter++;
        }   

        query += ` WHERE alsintan_id = $${paramCounter}`;
        values.push(id);
        
        db.query(query, values, (err, result) => {
            if (err) return res.status(500).json({ pesan: 'Gagal update data', error: err.message });
            res.status(200).json({ pesan: 'Data alsintan berhasil diperbarui'});
        });
    });
};

// 5. DELETE 
exports.deleteAlsintan = (req, res) => {
    const id = req.params.id;

    db.query(`SELECT gambar FROM alsintan WHERE alsintan_id = $1`, [id], (errCheck, rowsResult) => {
        if (errCheck) return res.status(500).json({ error: errCheck.message });
        if (rowsResult.rows.length === 0) return res.status(404).json({ pesan: 'Data tidak ditemukan' });

        db.query(`DELETE FROM riwayat_perjalanan WHERE alsintan_id = $1`, [id], () => {
            db.query(`DELETE FROM monitoring_status WHERE alsintan_id = $1`, [id], () => {
                db.query(`DELETE FROM alsintan WHERE alsintan_id = $1`, [id], (errDel) => {
                    if (errDel) return res.status(500).json({ error: errDel.message });
                    res.status(200).json({ pesan: 'Data alsintan berhasil dihapus permanen dari sistem' });
                });
            });
        });
    });
};

// 6. GET RIWAYAT (DENGAN FILTER TANGGAL) - [BUG FIX: Penambahan status_mesin]
exports.getRiwayat = (req, res) => {
    const id = req.params.id;
    const tanggal = req.query.tanggal;

    if (tanggal) {
        const queryHistory = `
            SELECT latitude, longitude, waktu_rekam, status_mesin 
            FROM riwayat_perjalanan 
            WHERE alsintan_id = $1 
            AND waktu_rekam >= $2::date
            AND waktu_rekam < ($2::date + interval '1 day')
            ORDER BY waktu_rekam ASC
        `;
        db.query(queryHistory, [id, tanggal], (errHist, results) => {
            if (errHist) return res.status(500).json({ error: errHist.message });
            res.json(results.rows);
        });
        return; 
    }

    const queryCheck = `SELECT waktu_reset FROM alsintan WHERE alsintan_id = $1`;
    db.query(queryCheck, [id], (err, rowsResult) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let queryHistory = "";
        let params = [id];

        if (rowsResult.rows.length > 0 && rowsResult.rows[0].waktu_reset) {
            queryHistory = `SELECT latitude, longitude, waktu_rekam, status_mesin FROM riwayat_perjalanan WHERE alsintan_id = $1 AND waktu_rekam >= $2 ORDER BY waktu_rekam ASC`;
            params.push(rowsResult.rows[0].waktu_reset);
        } else {
            queryHistory = `SELECT latitude, longitude, waktu_rekam, status_mesin FROM riwayat_perjalanan WHERE alsintan_id = $1 ORDER BY waktu_rekam ASC`;
        }

        db.query(queryHistory, params, (errHist, results) => {
            if (errHist) return res.status(500).json({ error: errHist.message });
            res.json(results.rows);
        });
    });
};

// 7. RESET ARGO
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

exports.registerIoT = async (req, res) => {
    const db = require('../config/database'); 
    const { id_alat } = req.body;

    if (!id_alat) {
        return res.status(400).json({ status: false, message: 'ID Alat wajib diisi!' });
    }

    try {
        const queryInsertAlat = `
            INSERT INTO alsintan (alsintan_id, latitude, longitude) 
            VALUES ($1, 0, 0) RETURNING alsintan_id
        `;
        await db.query(queryInsertAlat, [id_alat]);
        
        const queryInitStatus = `
            INSERT INTO monitoring_status (alsintan_id, status_mesin, total_jarak_kerja)
            VALUES ($1, 'OFF', 0)
        `;
        await db.query(queryInitStatus, [id_alat]);

        res.json({ 
            status: true, 
            message: `Perangkat IoT dengan ID ${id_alat} berhasil diregistrasi dan siap digunakan!` 
        });

    } catch (error) {
        console.error("Gagal registrasi alat:", error);
        if (error.code === '23505') {
            return res.status(400).json({ status: false, message: 'ID Alat ini sudah terdaftar di database!' });
        }
        res.status(500).json({ status: false, message: 'Terjadi kesalahan pada server database.' });
    }
};