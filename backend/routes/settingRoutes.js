const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');

router.get('/tarif', settingController.getTarif);
router.put('/tarif', settingController.updateTarif);

module.exports = router;