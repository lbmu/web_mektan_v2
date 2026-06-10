const express = require('express');
const router = express.Router();
const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;


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

// --- 1. ENDPOINT LOGIN (SUDAH DISELARASKAN DENGAN FRONTEND) ---
router.post('/login', (req, res) => {
    const { identifier, password } = req.body; 
    
    console.log("👉 Login Request untuk:", identifier); 

    if (!identifier || !password) {
        return res.status(400).json({ status: false, message: "Username dan password wajib diisi" });
    }

    // Mencari berdasarkan username ATAU email
    const query = "SELECT * FROM users WHERE username = $1 OR email = $2";
    
    db.query(query, [identifier, identifier], async (err, result) => {
        if (err) {
            console.error("❌ Login Database Error:", err.message);
            return res.status(500).json({ status: false, message: "Terjadi kesalahan pada database server" });
        }

        if (result.rows.length === 0) {
            return res.status(401).json({ status: false, message: "Username atau Password salah" });
        }

        const user = result.rows[0];

        try {
            let isMatch = false;

            // FAILSAFE DETEKSI AUTOMATIS:
            // Jika password di Neon diawali tanda '$', berarti itu adalah hash Bcrypt yang valid
            if (user.password && user.password.startsWith('$')) {
                isMatch = await bcrypt.compare(password, user.password);
            } else {
                // Jika tidak diawali '$', berarti di database Anda masih berupa teks biasa (plaintext)
                // Jalankan perbandingan string biasa agar Anda tetap bisa login demi kelancaran testing
                isMatch = (password === user.password);
            }
            
            if (!isMatch) {
                return res.status(401).json({ status: false, message: "Username atau Password salah" });
            }

            // Pembuatan token keamanan JWT (Masa berlaku 8 Jam)
            const token = jwt.sign(
                { userId: user.user_id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );

            // KUNCI PERBAIKAN: Menggunakan properti 'data' agar cocok 100% dengan komponen Vue Anda
            return res.json({
                status: true,
                message: "Login berhasil",
                token: token,
                data: {
                    id: user.user_id,
                    username: user.username,
                    nama: user.nama_lengkap,
                    role: user.role,
                    foto: user.foto_profil
                }
            });

        } catch (bcryptErr) {
            console.error("❌ Login Verification Error:", bcryptErr.message);
            return res.status(500).json({ status: false, message: "Gagal memproses verifikasi keamanan" });
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
router.put('/update/:id', upload.single('foto'), async (req, res) => {
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
        console.log("🔒 Ada Password Baru, memproses enkripsi...");
        try {
            const saltRounds = 10;
            // Node.js mengenkripsi password teks menjadi hash bcrypt
            const hashedPassword = await bcrypt.hash(safePass, saltRounds); 
            
            query += `, password=$${paramCounter}`;
            params.push(hashedPassword); // Yang dikirim ke database adalah hasil hash!
            paramCounter++;
        } catch (hashError) {
            console.error("❌ Hashing Error:", hashError.message);
            return res.status(500).json({ status: false, message: "Gagal mengenkripsi password baru" });
        }
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