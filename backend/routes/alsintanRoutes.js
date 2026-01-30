const express = require('express');
const router = express.Router();
const alsintanController = require('../controllers/alsintanController');
const upload = require('../middleware/upload');

// Route untuk menambahkan data alsintan baru dengan upload gambar
router.post('/', upload.single('gambar'), alsintanController.createAlsintan);

// Route untuk mengambil semua data alsintan
router.get('/alsintan', alsintanController.getAllAlsintan);

// Route untuk mengambil data alsintan berdasarkan ID
router.get('/alsintan/:id', alsintanController.getAlsintanById);

module.exports = router;
