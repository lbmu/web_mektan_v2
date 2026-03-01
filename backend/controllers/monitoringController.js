const db = require('../config/database');

exports.updateStatusMesin = (req, res) => {
    const {alsintan_id, status_mesin, latitude, longitude} = req.body;

    if (!alsintan_id || !status_mesin) {
        return res.status(400).json({pesan: 'id dan status_mesin harus diisi'});
}

    const query = `
        INSERT INTO monitoring_status (alsintan_id, status_mesin, latitude, longitude)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (alsintan_id) DO UPDATE SET
            status_mesin = EXCLUDED.status_mesin,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
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
    SELECT m.*, a.nama_alat, a.kategori_alat, a.merk_alat
    FROM monitoring_status m
    JOIN alsintan a ON m.alsintan_id = a.alsintan_id
    WHERE m.alsintan_id = $1
    `;

    db.query(query, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (results.rows.length === 0) {
            return res.status(404).json({ pesan: 'Data alat tidak ditemukan' });
        }
        res.status(200).json(results.rows[0]);
    });
};