const express = require('express');
const router = express.Router();
const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- KONFIGURASI MULTER (Tetap Sama) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/profiles');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage, 
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Hanya file gambar (jpeg, jpg, png) yang diizinkan!'));
    }
});

// --- 1. ENDPOINT LOGIN ---
router.post('/login', (req, res) => {
    const { identifier, password } = req.body;
    
    console.log("👉 Login Request:", identifier); 

    if (!identifier || !password) {
        return res.status(400).json({ status: false, message: "Username/Email dan Password wajib diisi!" });
    }

    // PERUBAHAN POSTGRES: Gunakan $1, $2, $3 bukan ?
    const query = "SELECT * FROM users WHERE (username = $1 OR email = $2) AND password = $3";
    
    db.query(query, [identifier, identifier, password], (err, results) => {
        if (err) {
            console.error("❌ Login DB Error:", err);
            return res.status(500).json({ status: false, message: "Database Error" });
        }

        // PERUBAHAN POSTGRES: Hasil query ada di results.rows
        if (results.rows.length > 0) {
            const user = results.rows[0];
            
            console.log("✅ User Ditemukan:", user); 

            res.json({
                status: true,
                message: "Login Berhasil",
                data: {
                    id: user.user_id,          
                    username: user.username,   
                    nama: user.nama_lengkap,   
                    role: user.role,
                    foto: user.foto_profil
                }
            });
        } else {
            res.status(401).json({ status: false, message: "Username atau Password Salah" });
        }
    });
});

// --- 2. ENDPOINT GET PROFILE ---
router.get('/profile/:id', (req, res) => {
    // PERUBAHAN POSTGRES: Gunakan $1
    const query = 'SELECT user_id, username, email, nama_lengkap, role, nip, no_hp, foto_profil FROM users WHERE user_id = $1';

    db.query(query, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({status: false, message: "Database error"});

        // PERUBAHAN POSTGRES: Gunakan results.rows
        if (results.rows.length > 0) {
            res.json({status: true, data: results.rows[0]});
        } else {
            res.status(404).json({status: false, message: "User tidak ditemukan"});
        }
    });
});

// --- 3. ENDPOINT UPDATE PROFILE ---
router.put('/update/:id', upload.single('foto'), (req, res) => {
    const userId = req.params.id;
    const { nama_lengkap, email, nip, no_hp, password } = req.body;

    console.log(`👉 Request Update User ID ${userId}`);

    const safeNip = (nip && nip.trim() !== "") ? nip : null;
    const safeHp = (no_hp && no_hp.trim() !== "") ? no_hp : null;
    const safePass = (password && password.trim() !== "") ? password : null;

    // PERUBAHAN POSTGRES: Parameter dinamis
    let query = "UPDATE users SET nama_lengkap=$1, email=$2, nip=$3, no_hp=$4";
    let params = [nama_lengkap, email, safeNip, safeHp];
    let paramCounter = 5; // Mulai dari $5 karena $1-$4 sudah dipakai

    if (req.file) {
        console.log("📸 Ada Foto Baru:", req.file.filename);
        query += `, foto_profil=$${paramCounter}`;
        params.push(req.file.filename);
        paramCounter++;
    }

    if (safePass) {
        console.log("🔒 Ada Password Baru");
        query += `, password=$${paramCounter}`;
        params.push(safePass);
        paramCounter++;
    }

    query += ` WHERE user_id=$${paramCounter}`;
    params.push(userId);

    db.query(query, params, (err, result) => {
        if (err) {
            console.error("❌ SQL UPDATE ERROR:", err.message); 
            return res.status(500).json({ 
                status: false, 
                message: "Gagal Update Database: " + err.message 
            });
        }

        // Ambil data terbaru
        const selectQuery = "SELECT user_id, username, email, nama_lengkap, role, nip, no_hp, foto_profil FROM users WHERE user_id = $1";
        db.query(selectQuery, [userId], (err, rows) => {
            if (err) return res.status(500).json({status: false, message: "Update berhasil tapi gagal fetch data"});
            
            res.json({
                status: true,
                message: "Profile berhasil diperbarui!",
                data: rows.rows[0] // PERUBAHAN POSTGRES: rows.rows
            });
        });
    });
});

module.exports = router;