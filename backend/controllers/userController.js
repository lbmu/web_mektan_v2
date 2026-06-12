const db = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// =========================================================
// 1. FUNGSI LOGIN (DENGAN SINGLE SESSION)
// =========================================================
exports.loginUser = (req, res) => {
    const { identifier, password } = req.body; 

    if (!identifier || !password) {
        return res.status(400).json({ status: false, message: "Username dan password wajib diisi" });
    }

    const query = "SELECT * FROM users WHERE username = $1 OR email = $2";
    
    db.query(query, [identifier, identifier], async (err, result) => {
        if (err) return res.status(500).json({ status: false, message: "Database server error" });
        if (result.rows.length === 0) return res.status(401).json({ status: false, message: "Username atau Password salah" });

        const user = result.rows[0];

        try {
            let isMatch = false;
            if (user.password && user.password.startsWith('$')) {
                isMatch = await bcrypt.compare(password, user.password);
            } else {
                isMatch = (password === user.password);
            }
            
            if (!isMatch) return res.status(401).json({ status: false, message: "Username atau Password salah" });

            // Cetak Token
            const token = jwt.sign(
                { id: user.user_id, role: user.role }, // PERBAIKAN: ubah userId menjadi id agar seragam dengan authMiddleware
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );

            // KUNCI SINGLE SESSION: Simpan token ini ke database sebagai token yang paling "Sah"
            const queryUpdateToken = "UPDATE users SET current_token = $1 WHERE user_id = $2";
            db.query(queryUpdateToken, [token, user.user_id], (errUpdate) => {
                if (errUpdate) console.error("Gagal menyimpan current_token:", errUpdate.message);
                
                // Kirim respons balik ke Vue
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
            });

        } catch (error) {
            return res.status(500).json({ status: false, message: "Server error" });
        }
    });
};

// =========================================================
// 2. FUNGSI GET PROFILE
// =========================================================
exports.getProfile = (req, res) => {
    const query = 'SELECT user_id, username, email, nama_lengkap, role, nip, no_hp, foto_profil FROM users WHERE user_id = $1';
    db.query(query, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({status: false, message: "Database error"});
        if (results.rows.length > 0) res.json({status: true, data: results.rows[0]});
        else res.status(404).json({status: false, message: "User tidak ditemukan"});
    });
};

// =========================================================
// 3. FUNGSI UPDATE PROFILE
// =========================================================
exports.updateProfile = async (req, res) => {
    const userId = req.params.id;
    const { nama_lengkap, email, nip, no_hp, password } = req.body;

    const safeNip = (nip && nip.trim() !== "") ? nip : null;
    const safeHp = (no_hp && no_hp.trim() !== "") ? no_hp : null;
    const safePass = (password && password.trim() !== "") ? password : null;

    let query = "UPDATE users SET nama_lengkap=$1, email=$2, nip=$3, no_hp=$4";
    let params = [nama_lengkap, email, safeNip, safeHp];
    let paramCounter = 5; 

    if (req.file) {
        query += `, foto_profil=$${paramCounter}`;
        params.push(req.file.filename);
        paramCounter++;
    }

    if (safePass) {
        try {
            const hashedPassword = await bcrypt.hash(safePass, 10); 
            query += `, password=$${paramCounter}`;
            params.push(hashedPassword); 
            paramCounter++;
        } catch (err) {
            return res.status(500).json({ status: false, message: "Gagal enkripsi password" });
        }
    }

    query += ` WHERE user_id=$${paramCounter}`;
    params.push(userId);

    db.query(query, params, (err, result) => {
        if (err) return res.status(500).json({ status: false, message: "Gagal Update Database" });

        const selectQuery = "SELECT user_id, username, email, nama_lengkap, role, nip, no_hp, foto_profil FROM users WHERE user_id = $1";
        db.query(selectQuery, [userId], (err, rows) => {
            if (err) return res.status(500).json({status: false, message: "Update sukses tapi gagal fetch data"});
            res.json({ status: true, message: "Profile diperbarui!", data: rows.rows[0] });
        });
    });
};