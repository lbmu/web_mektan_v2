const express = require('express');
const router = express.Router();
const monitoringController = require('../controllers/monitoringController'); 

router.post('/update-status', monitoringController.updateStatusMesin);
router.get('/status/:id', monitoringController.getStatusMesin);

module.exports = router;