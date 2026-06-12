const jwt = require('jsonwebtoken');
const db = require('../config/database'); 

// 💡 PERBAIKAN: Perhatikan penambahan kata 'async' di baris ini
const verifyToken = async (req, res, next) => {
    // 1. Menangkap token dari header permintaan
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(403).json({ status: false, message: "Akses ditolak. Token tidak ditemukan!" });
    }

    try {
        // 2. Memverifikasi keaslian kriptografi token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 3. LOGIKA SINGLE SESSION
        const queryCheck = `SELECT current_token FROM users WHERE user_id = $1`;
        
        // Karena ada 'await' di sini, fungsi induknya (verifyToken) WAJIB menggunakan 'async'
        const result = await db.query(queryCheck, [decoded.id]); 

        if (result.rows.length === 0) {
            return res.status(404).json({ status: false, message: "Pengguna tidak ditemukan." });
        }

        const tokenDiDatabase = result.rows[0].current_token;

        if (token !== tokenDiDatabase) {
            return res.status(401).json({ 
                status: false, 
                message: "Sesi telah berakhir karena akun ini baru saja masuk di perangkat lain." 
            });
        }

        // 4. Loloskan jika token valid
        req.user = decoded; 
        next(); 
        
    } catch (err) {
        return res.status(401).json({ status: false, message: "Sesi tidak valid atau telah kedaluwarsa!" });
    }
};

module.exports = verifyToken;