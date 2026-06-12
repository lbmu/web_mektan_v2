const express = require('express');
const router = express.Router();
const alsintanController = require('../controllers/alsintanController');
const upload = require('../middleware/upload');
const verifyToken = require('../middleware/authMiddleware');

// Route untuk menambahkan data alsintan baru dengan upload gambar
router.post('/', verifyToken, upload.single('gambar'), alsintanController.createAlsintan);

// Route untuk mengambil semua data alsintan
router.get('/', verifyToken, alsintanController.getAllAlsintan);

// Route untuk mengambil data alsintan berdasarkan ID
router.get('/:id', verifyToken, alsintanController.getAlsintanById);

router.put('/:id', verifyToken, upload.single('gambar'), alsintanController.updateAlsintan);

router.delete('/:id', verifyToken, alsintanController.deleteAlsintan);

router.get('/:id/riwayat', verifyToken, alsintanController.getRiwayat);

router.post('/:id/reset', verifyToken, alsintanController.resetArgo);

router.delete('/:id', (req, res) => {
    const db = require('../config/database');
    db.query('DELETE FROM alsintan WHERE alsintan_id = $1', [req.params.id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ pesan: 'Berhasil dihapus' });
    });
});

router.post('/register', alsintanController.registerIoT);

module.exports = router;
