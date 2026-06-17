const express = require('express');
const router = express.Router();
const alsintanController = require('../controllers/alsintanController');
const upload = require('../middleware/upload');
const verifyToken = require('../middleware/authMiddleware');

// 🔒 PRIVATE: Route untuk menambahkan data alsintan baru dengan upload gambar
router.post('/', verifyToken, upload.single('gambar'), alsintanController.createAlsintan);

// 🔓 PUBLIC: Route untuk mengambil semua data alsintan (Katalog / Dashboard Umum)
router.get('/', alsintanController.getAllAlsintan);

// 🔓 PUBLIC: Route untuk mengambil data alsintan berdasarkan ID (Detail Aset Umum)
router.get('/:id', alsintanController.getAlsintanById);

// 🔒 PRIVATE: Route untuk Edit Aset
router.put('/:id', verifyToken, upload.single('gambar'), alsintanController.updateAlsintan);

// 🔒 PRIVATE: Route untuk Hapus Aset
router.delete('/:id', verifyToken, alsintanController.deleteAlsintan);

// 🔒 PRIVATE: Route untuk Riwayat Peta & Telemetri
router.get('/:id/riwayat', verifyToken, alsintanController.getRiwayat);

// 🔒 PRIVATE: Route untuk Reset Argo
router.post('/:id/reset', verifyToken, alsintanController.resetArgo);

// (Route duplikat untuk hapus dari versi sebelumnya, dibiarkan saja jika dipakai)
router.delete('/:id', (req, res) => {
    const db = require('../config/database');
    db.query('DELETE FROM alsintan WHERE alsintan_id = $1', [req.params.id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ pesan: 'Berhasil dihapus' });
    });
});

// 🔓 PUBLIC: Route dari Hardware ESP32 untuk registrasi otomatis
router.post('/register', alsintanController.registerIoT);

module.exports = router;