const db = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// =========================================================
// 1. FUNGSI LOGIN 
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

        if (user.status_akun === 'pending') {
            return res.status(403).json({ status: false, message: "Akun Anda sedang menunggu proses verifikasi oleh BP Mektan Jabar." });
        }
        
        if (user.status_akun === 'ditolak') {
            return res.status(403).json({ status: false, message: "Akses ditolak. Pengajuan akun Anda telah ditolak oleh BP Mektan." });
        }

        try {
            let isMatch = false;
            if (user.password && user.password.startsWith('$')) {
                isMatch = await bcrypt.compare(password, user.password);
            } else {
                isMatch = (password === user.password);
            }
            
            if (!isMatch) return res.status(401).json({ status: false, message: "Username atau Password salah" });

            const token = jwt.sign(
                { id: user.user_id, role: user.role }, 
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );

            const queryUpdateToken = "UPDATE users SET current_token = $1 WHERE user_id = $2";
            db.query(queryUpdateToken, [token, user.user_id], (errUpdate) => {
                if (errUpdate) console.error("Gagal menyimpan current_token:", errUpdate.message);
                
                return res.json({
                    status: true,
                    message: "Login berhasil",
                    token: token,
                    data: {
                        id: user.user_id,
                        username: user.username,
                        // Jika role upja, bisa gunakan nama instansi sebagai nama tampilan
                        nama: user.role === 'upja' && user.nama_instansi ? user.nama_instansi : user.nama_lengkap,
                        nama_lengkap: user.nama_lengkap,
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
// 2. FUNGSI GET PROFILE (DIPERBARUI)
// =========================================================
exports.getProfile = (req, res) => {
    // Menambahkan nama_instansi, kabupaten, kecamatan, dan desa pada proses SELECT
    const query = `
        SELECT user_id, username, email, nama_lengkap, role, nip, no_hp, foto_profil, status_akun,
               nama_instansi, kabupaten, kecamatan, desa 
        FROM users WHERE user_id = $1
    `;
    db.query(query, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({status: false, message: "Database error"});
        if (results.rows.length > 0) res.json({status: true, data: results.rows[0]});
        else res.status(404).json({status: false, message: "User tidak ditemukan"});
    });
};

// =========================================================
// 3. FUNGSI UPDATE PROFILE (DIPERBARUI)
// =========================================================
exports.updateProfile = async (req, res) => {
    const userId = req.params.id;
    // Menangkap 4 variabel baru dari Frontend
    const { email, nama_lengkap, nip, no_hp, password, nama_instansi, kabupaten, kecamatan, desa } = req.body;

    const safeNip = (nip && nip.trim() !== "") ? nip : null;
    const safeHp = (no_hp && no_hp.trim() !== "") ? no_hp : null;
    const safePass = (password && password.trim() !== "") ? password : null;

    let query = `
        UPDATE users SET 
            email = $1, nama_lengkap = $2, nip = $3, no_hp = $4,
            nama_instansi = $5, kabupaten = $6, kecamatan = $7, desa = $8
    `;
    
    // Perbaikan urutan array params agar presisi dengan index $1 hingga $8 di query SQL
    let params = [
        email, 
        nama_lengkap, 
        safeNip, 
        safeHp, 
        nama_instansi || null, 
        kabupaten || null, 
        kecamatan || null, 
        desa || null
    ];
    
    let paramCounter = 9; // Lanjut ke index $9 untuk foto, password, dan ID

    if (req.file) {
        console.log("📸 Foto sukses diunggah ke Cloudinary:", req.file.path);
        query += `, foto_profil=$${paramCounter}`;
        params.push(req.file.path); 
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
        if (err) return res.status(500).json({ status: false, message: "Gagal Update Database", error: err.message });

        // Tarik ulang data lengkap untuk dikembalikan ke Frontend (Session)
        const selectQuery = `
            SELECT user_id, username, email, nama_lengkap, role, nip, no_hp, foto_profil,
                   nama_instansi, kabupaten, kecamatan, desa 
            FROM users WHERE user_id = $1
        `;
        db.query(selectQuery, [userId], (err, rows) => {
            if (err) return res.status(500).json({status: false, message: "Update sukses tapi gagal fetch data"});
            res.json({ status: true, message: "Profile diperbarui!", data: rows.rows[0] });
        });
    });
};

// =========================================================
// 4. FUNGSI REGISTRASI (DIPERBARUI)
// =========================================================
exports.registerUser = (req, res) => {
    // Menangkap field baru dari form registrasi UPJA
    const { username, email, nama_lengkap, no_hp, password, nama_instansi, kabupaten, kecamatan, desa } = req.body; 

    // Validasi pengetatan wajib isi untuk UPJA
    if (!username || !email || !password || !nama_lengkap || !nama_instansi || !kabupaten || !kecamatan || !desa) {
        return res.status(400).json({ status: false, message: "Seluruh form registrasi dan lokasi wajib diisi!" });
    }

    const queryCheck = "SELECT * FROM users WHERE username = $1 OR email = $2";
    db.query(queryCheck, [username, email], async (err, result) => {
        if (err) return res.status(500).json({ status: false, message: "Database server error" });
        if (result.rows.length > 0) return res.status(400).json({ status: false, message: "Username atau Email sudah terdaftar!" });

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Menyuntikkan 4 variabel baru ke dalam tabel users
            const queryInsert = `
                INSERT INTO users (username, email, nama_lengkap, no_hp, password, role, status_akun, nama_instansi, kabupaten, kecamatan, desa) 
                VALUES ($1, $2, $3, $4, $5, 'upja', 'pending', $6, $7, $8, $9)
            `;
            
            db.query(queryInsert, [username, email, nama_lengkap, no_hp, hashedPassword, nama_instansi, kabupaten, kecamatan, desa], (errInsert) => {
                if (errInsert) return res.status(500).json({ status: false, message: "Gagal menyimpan akun ke database", error: errInsert.message });
                return res.status(201).json({ 
                    status: true, 
                    message: "Registrasi berhasil! Akun Anda sedang menunggu verifikasi dari Admin Mektan." 
                });
            });
        } catch (hashError) {
            return res.status(500).json({ status: false, message: "Gagal memproses enkripsi keamanan" });
        }
    });
};

// =========================================================
// 5. ADMIN: MENGAMBIL DAFTAR AKUN PENDING 
// =========================================================
exports.getPendingUsers = (req, res) => {
    // Menarik nama instansi agar admin tahu kelompok tani mana yang mendaftar
    const query = `
        SELECT user_id, username, email, nama_lengkap, nama_instansi, no_hp, role, status_akun, kabupaten, kecamatan, desa
        FROM users 
        WHERE status_akun = 'pending' 
        ORDER BY user_id DESC
    `;
    db.query(query, (err, result) => {
        if (err) return res.status(500).json({ status: false, message: "Database server error" });
        res.json({ status: true, data: result.rows });
    });
};

// =========================================================
// 6. ADMIN: VERIFIKASI AKUN (ACC / TOLAK)
// =========================================================
exports.verifyUser = (req, res) => {
    const userId = req.params.id;
    const { action } = req.body; 

    if (!['aktif', 'ditolak'].includes(action)) {
        return res.status(400).json({ status: false, message: "Aksi verifikasi tidak valid" });
    }

    const query = "UPDATE users SET status_akun = $1 WHERE user_id = $2";
    db.query(query, [action, userId], (err, result) => {
        if (err) return res.status(500).json({ status: false, message: "Gagal memproses verifikasi di database" });
        
        const pesan = action === 'aktif' ? 'Akun berhasil diaktifkan!' : 'Pengajuan Akun ditolak.';
        res.json({ status: true, message: pesan });
    });
};