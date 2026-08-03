const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const upload = require('../middleware/upload');
const verifyToken = require('../middleware/authMiddleware');

// Resepsionis mengarahkan tamu ke fungsi yang tepat
router.post('/login', userController.loginUser);
router.get('/pending', userController.getPendingUsers);
router.get('/profile/:id', verifyToken, userController.getProfile);
router.put('/update/:id', verifyToken, upload.single('foto'), userController.updateProfile);
router.post('/register', userController.registerUser);
router.post('/verify/:id', userController.verifyUser);

module.exports = router;