const db = require('../config/database');


//ambil seluruh data tabel
exports.getAllAlsintan = (req, res) => {
    const query = 'SELECT * FROM alsintan ORDER BY alsintan_id DESC';
    db.query(query, (err, results) => {
        if (err) { return res.status(500).json({ error: err.message }); }
        res.status(200).json(results);
    });
};

//ambil data berdasarkan id (button "lihat detail")
exports.getAlsintanById = (req, res) => {
    const id = req.params.id;
    const query = 'SELECT * FROM alsintan WHERE alsintan_id = ?';

    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ pesan : 'Data alat tidak tersedia'});
        res.status(200).json(results[0]);
    });
};

//menambahkan data baru alsintan
exports.createAlsintan = (req, res) => {
    const {
        kode_perangkat,
        nama_alat,
        kategori_alat,
        merk_alat,
        nomor_seri,
        status_sensor,
        status_operasional,
        deskripsi,
        kapasitas_lahan,
    } = req.body;

    const status_mesin = req.body.status || 'OFF';
    const gambar = req.file ? req.file.filename : 'default.jpg';

    if (!kode_perangkat || !nama_alat) {
        return res.status(400).json({ pesan: 'Kode perangkat dan nama alat harus diisi' });
    }

    const query = `
        INSERT INTO alsintan
        (kode_perangkat, nama_alat, kategori_alat, merk_alat, nomor_seri, status_sensor, status_operasional, deskripsi, kapasitas_lahan, status_mesin, gambar)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

    const values = [
        kode_perangkat,
        nama_alat,
        kategori_alat,
        merk_alat,
        status_mesin,
        nomor_seri,
        status_sensor,
        status_operasional,
        deskripsi,
        kapasitas_lahan,
        gambar,
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ pesan: 'Kode perangkat sudah terdaftar' });
            }
            return res.status(500).json({ pesan: 'Gagal menambahkan ke database', error: err.sqlMessage });
        }

        res.status(201).json({
            pesan: 'Berhasil menambahkan alsintan baru!',
            data: { id: result.insertId, ...req.body, gambar }
        });
    });
};