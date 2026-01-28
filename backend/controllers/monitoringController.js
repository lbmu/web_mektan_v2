const db = require('../config/database');

exports.updateStatusMesin = (req, res) => {
    const {alsintan_id, status_mesin, latitude, longitude} = req.body;

    if (!alsintan_id || !status_mesin) {
        return res.status(400).json({pesan: 'id dan status_mesin harus diisi'});
}

    const query = `
        INSERT INTO monitoring_status (alsintan_id, status_mesin, latitude, longitude)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        status_mesin = VALUES(status_mesin), 
        latitude = VALUES(latitude),
        longitude = VALUES(longitude),
        updated_at = NOW()
        `;
        
    db.query(query, [alsintan_id, status_mesin, latitude, longitude], (err, result) => {
        if (err) {
            console.error('Gagal simpan data:', err);
            return res.status(500).json({ pesan: 'Gagal menyimpan ke database', error: err.sqlMessage });
        }

        res.status(200).json({ pesan: 'Status mesin berhasil diperbarui', data: { alsintan_id, status_mesin, latitude, longitude } 
        });
    });
};

exports.getStatusMesin = (req, res) => {
    const id = req.params.id;

    const query = `
        SELECT m.*, a.nama_alat, a.jenis_alat
        FROM monitoring_status m
        JOIN alsintan a ON m.alsintan_id = a.alsintan_id
        WHERE m.alsintan_id = ?
    `;

    db.query(query, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (results.length === 0) {
            return res.status(404).json({ pesan: 'Data alat tidak ditemukan' });
        }

        res.status(200).json(results[0]);
    });
};