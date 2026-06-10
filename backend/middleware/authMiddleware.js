const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    // Menangkap token dari header permintaan
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(403).json({ status: false, message: "Akses ditolak. Token tidak ditemukan!" });
    }

    try {
        // Memverifikasi keaslian token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Menyimpan data user (seperti ID dan Role) ke dalam request
        next(); // Loloskan ke rute tujuan
    } catch (err) {
        return res.status(401).json({ status: false, message: "Sesi tidak valid atau telah kedaluwarsa!" });
    }
};

module.exports = verifyToken;