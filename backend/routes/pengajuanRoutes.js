const express = require('express');
const router = express.Router();
const pengajuanController = require('../controllers/pengajuanController');
const verifyToken = require('../middleware/authMiddleware'); 

// 🔓 PUBLIC (Tanpa Token): Petani mengajukan pinjaman alat
router.post('/public', pengajuanController.createPengajuanPublik);

// 🔒 PRIVATE (Admin Only): Manajemen Antrean
router.get('/admin', verifyToken, pengajuanController.getAllPengajuan);
router.post('/admin/acc/:id_pengajuan', verifyToken, pengajuanController.accPengajuan);
router.post('/admin/tolak/:id_pengajuan', verifyToken, pengajuanController.tolakPengajuan);

module.exports = router;