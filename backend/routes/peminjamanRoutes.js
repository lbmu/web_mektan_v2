const express = require('express');
const router = express.Router();
const peminjamanController = require('../controllers/peminjamanController');
const verifyToken = require('../middleware/authMiddleware');

// 🔒 PRIVATE (Admin Only): Mengeluarkan Surat Pinjam
router.post('/admin-pinjam', verifyToken, peminjamanController.adminPinjamkan);

// 🔓 PUBLIC (Guest/Admin): Cek Transaksi Aktif untuk ditampikan di Halaman Detail Aset
router.get('/aktif/:alsintan_id', peminjamanController.getTransaksiAktif);

// 🔒 PRIVATE (Admin Only): Menyelesaikan Peminjaman (Barang Kembali)
router.post('/selesai/:id_transaksi', verifyToken, peminjamanController.selesaikanPinjaman);

module.exports = router;