const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.post('/login', (req, res) => {

    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({status: 'false', message: "Username/Email dan Password harus diisi"});
    }

    const query = `
        SELECT user_id, username, email, nama_lengkap, role, foto_profil 
        FROM users 
        WHERE (username = ? OR email = ?) AND password = ?
    `;

    db.query(query, [identifier, identifier, password], (err, results) => {
        if (err) {
            console.error('Login Error:', err);
            return res.status(500).json({status: 'false', message: "Terjadi kesalahan pada server"});
        }

        if (results.length > 0) {
            const user = results[0];

            res.json({
                status: 'true',
                message: "Login berhasil",
                data: {
                    id: user.user_id,
                    username: user.username,
                    nama: user.nama_lengkap,
                    role: user.role,
                    foto: user.foto_profil
                }
            });
        } else {
            res.status(401).json({status: 'false', message: "Username/Email atau Password salah"});
        }
    });
});

module.exports = router;