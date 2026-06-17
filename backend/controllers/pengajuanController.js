const db = require('../config/database');

// ======================================================
// 1. PUBLIC: Mengirim Pengajuan Baru (Oleh Petani)
// ======================================================
exports.createPengajuanPublik = async (req, res) => {
    const {
        alsintan_id, tanggal_mulai, tanggal_berakhir,
        nama_peminjam, jabatan_peminjam, kontak_peminjam, nama_kelompok,
        desa, kecamatan, kabupaten
    } = req.body;

    // Validasi input dasar
    if (!alsintan_id || !tanggal_mulai || !tanggal_berakhir || !nama_peminjam || !kontak_peminjam) {
        return res.status(400).json({ status: false, message: "Data wajib belum lengkap!" });
    }

    try {
        const queryInsert = `
            INSERT INTO pengajuan_publik (
                alsintan_id, tanggal_mulai, tanggal_berakhir,
                nama_peminjam, jabatan_peminjam, kontak_peminjam, nama_kelompok,
                desa, kecamatan, kabupaten, status_pengajuan
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Pending')
        `;
        const values = [
            alsintan_id, tanggal_mulai, tanggal_berakhir,
            nama_peminjam, jabatan_peminjam, kontak_peminjam, nama_kelompok,
            desa, kecamatan, kabupaten
        ];
        
        await db.query(queryInsert, values);
        res.json({ status: true, message: "Pengajuan berhasil dikirim! Silakan tunggu admin menghubungi Anda." });
    } catch (error) {
        console.error("Error submit pengajuan:", error);
        res.status(500).json({ status: false, message: "Terjadi kesalahan server saat mengirim data." });
    }
};

// ======================================================
// 2. ADMIN: Mengambil Semua Daftar Antrean (Pending)
// ======================================================
exports.getAllPengajuan = async (req, res) => {
    try {
        // Melakukan JOIN agar Admin bisa melihat nama traktor yang diajukan
        const query = `
            SELECT p.*, a.nama_alat, a.kode_perangkat, a.gambar 
            FROM pengajuan_publik p
            JOIN alsintan a ON p.alsintan_id = a.alsintan_id
            WHERE p.status_pengajuan = 'Pending'
            ORDER BY p.created_at ASC
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ status: false, message: "Terjadi kesalahan mengambil data antrean." });
    }
};

// ======================================================
// 3. ADMIN: ACC Pengajuan & Terbitkan Surat Jalan
// ======================================================
exports.accPengajuan = async (req, res) => {
    const { id_pengajuan } = req.params;
    const { nomor_ba, biaya_jasa } = req.body;

    if (!nomor_ba) {
        return res.status(400).json({ status: false, message: "Nomor BA wajib diisi untuk melakukan ACC!" });
    }

    try {
        await db.query('BEGIN'); // Memulai transaksi database berantai

        // 1. Ambil data mentah dari tabel pengajuan_publik
        const getPengajuan = await db.query("SELECT * FROM pengajuan_publik WHERE id_pengajuan = $1", [id_pengajuan]);
        if (getPengajuan.rows.length === 0) throw new Error("Data pengajuan tidak ditemukan");
        
        const data = getPengajuan.rows[0];

        // 2. Copy-Paste (Pindahkan) data ke tabel transaksi_peminjaman resmi
        const queryInsertTransaksi = `
            INSERT INTO transaksi_peminjaman (
                alsintan_id, tanggal_mulai, tanggal_berakhir, nomor_ba, 
                nama_peminjam, jabatan_peminjam, kontak_peminjam, nama_kelompok, 
                desa, kecamatan, kabupaten, biaya_jasa, status_pinjam
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Sedang Dipinjam')
        `;
        const valuesTransaksi = [
            data.alsintan_id, data.tanggal_mulai, data.tanggal_berakhir, nomor_ba,
            data.nama_peminjam, data.jabatan_peminjam, data.kontak_peminjam, data.nama_kelompok,
            data.desa, data.kecamatan, data.kabupaten, biaya_jasa || 0
        ];
        await db.query(queryInsertTransaksi, valuesTransaksi);

        // 3. Ubah status fisik alsintan menjadi 'Sedang Dipinjam'
        await db.query("UPDATE alsintan SET status_ketersediaan = 'Sedang Dipinjam' WHERE alsintan_id = $1", [data.alsintan_id]);

        // 4. Ubah status pengajuan publik ini menjadi 'Diterima' agar hilang dari antrean
        await db.query("UPDATE pengajuan_publik SET status_pengajuan = 'Diterima' WHERE id_pengajuan = $1", [id_pengajuan]);

        await db.query('COMMIT'); // Simpan semua perubahan
        res.json({ status: true, message: "Pengajuan di-ACC! Alat berhasil dikeluarkan dan tercatat di transaksi resmi." });

    } catch (error) {
        await db.query('ROLLBACK'); // Batalkan semua jika ada 1 saja yang error
        console.error("Gagal ACC pengajuan:", error);
        res.status(500).json({ status: false, message: error.message || "Terjadi kesalahan internal." });
    }
};

// ======================================================
// 4. ADMIN: Tolak Pengajuan
// ======================================================
exports.tolakPengajuan = async (req, res) => {
    const { id_pengajuan } = req.params;
    
    try {
        await db.query(
            "UPDATE pengajuan_publik SET status_pengajuan = 'Ditolak' WHERE id_pengajuan = $1",
            [id_pengajuan]
        );
        res.json({ status: true, message: "Pengajuan berhasil ditolak dan dihapus dari antrean." });
    } catch (error) {
        res.status(500).json({ status: false, message: "Terjadi kesalahan server." });
    }
};