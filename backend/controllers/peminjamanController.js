const db = require('../config/database');

// 1. ADMIN: Mengeluarkan Surat Jalan / Meminjamkan Alat
exports.adminPinjamkan = async (req, res) => {
    const { 
        alsintan_id, tanggal_mulai, tanggal_berakhir, nomor_ba, 
        nama_peminjam, jabatan_peminjam, kontak_peminjam, nama_kelompok, 
        desa, kecamatan, kabupaten, biaya_jasa 
    } = req.body;

    if (!alsintan_id || !tanggal_mulai || !tanggal_berakhir || !nama_peminjam) {
        return res.status(400).json({ status: false, message: "Data wajib belum lengkap!" });
    }

    try {
        await db.query('BEGIN'); // Mulai transaksi database yang aman

        // 1. Masukkan ke riwayat peminjaman
        const queryInsert = `
            INSERT INTO transaksi_peminjaman (
                alsintan_id, tanggal_mulai, tanggal_berakhir, nomor_ba, 
                nama_peminjam, jabatan_peminjam, kontak_peminjam, nama_kelompok, 
                desa, kecamatan, kabupaten, biaya_jasa, status_pinjam
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Sedang Dipinjam')
        `;
        const values = [
            alsintan_id, tanggal_mulai, tanggal_berakhir, nomor_ba, 
            nama_peminjam, jabatan_peminjam, kontak_peminjam, nama_kelompok, 
            desa, kecamatan, kabupaten, biaya_jasa
        ];
        
        await db.query(queryInsert, values);

        // 2. Ubah status fisik traktor di tabel alsintan
        await db.query(
            "UPDATE alsintan SET status_ketersediaan = 'Sedang Dipinjam' WHERE alsintan_id = $1", 
            [alsintan_id]
        );

        await db.query('COMMIT'); // Simpan permanen
        res.json({ status: true, message: "Surat jalan peminjaman berhasil diterbitkan." });

    } catch (error) {
        await db.query('ROLLBACK'); // Batalkan jika ada error di tengah jalan
        console.error("Gagal meminjamkan alat:", error);
        res.status(500).json({ status: false, message: "Terjadi kesalahan server." });
    }
};

// 2. PUBLIC/ADMIN: Mengecek Detail Transaksi yang Sedang Berjalan (Untuk ditampilkan di Detail Aset)
exports.getTransaksiAktif = async (req, res) => {
    const { alsintan_id } = req.params;
    try {
        const query = `
            SELECT * FROM transaksi_peminjaman 
            WHERE alsintan_id = $1 AND status_pinjam = 'Sedang Dipinjam'
            ORDER BY id_transaksi DESC LIMIT 1
        `;
        const result = await db.query(query, [alsintan_id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ status: false, message: "Tidak ada transaksi aktif." });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
};

// 3. ADMIN: Menyelesaikan Peminjaman (Barang Kembali ke Balai)
exports.selesaikanPinjaman = async (req, res) => {
    const { id_transaksi } = req.params;
    const { alsintan_id } = req.body;

    try {
        await db.query('BEGIN');

        // 1. Tandai transaksi selesai
        await db.query(
            "UPDATE transaksi_peminjaman SET status_pinjam = 'Selesai' WHERE id_transaksi = $1", 
            [id_transaksi]
        );

        // 2. Kembalikan status traktor menjadi Tersedia
        await db.query(
            "UPDATE alsintan SET status_ketersediaan = 'Tersedia di Balai' WHERE alsintan_id = $1", 
            [alsintan_id]
        );

        await db.query('COMMIT');
        res.json({ status: true, message: "Peminjaman selesai, aset telah kembali ke balai." });

    } catch (error) {
        await db.query('ROLLBACK');
        res.status(500).json({ status: false, message: "Terjadi kesalahan server." });
    }
};