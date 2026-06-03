const db = require('../config/database');

exports.getTarif = (req, res) => {
    db.query(`SELECT nilai FROM pengaturan_sistem WHERE kunci = 'tarif_per_ha'`, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.rows.length === 0) return res.json({ nilai: 1500000 }); // Pengaman default
        res.json({ nilai: result.rows[0].nilai });
    });
};

exports.updateTarif = (req, res) => {
    const { nilai } = req.body;
    if (nilai === undefined) return res.status(400).json({ error: 'Nilai tarif tidak boleh kosong' });

    db.query(`UPDATE pengaturan_sistem SET nilai = $1 WHERE kunci = 'tarif_per_ha'`, [nilai], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Tarif berhasil diperbarui di seluruh sistem!' });
    });
};