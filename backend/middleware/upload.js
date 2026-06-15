const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// 1. Konfigurasi Kunci Cloudinary (Diambil dari file .env)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Konfigurasi Brankas Penyimpanan Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'mymektan_assets', // Nama folder yang akan otomatis dibuat di akun Cloudinary Anda
        allowed_formats: ['jpeg', 'jpg', 'png'], // Otomatis menyaring tipe file
        // Fitur tambahan Cloudinary: Otomatis mengkompres ukuran agar website tidak berat
        transformation: [{ width: 800, height: 800, crop: "limit" }] 
    }
});

// 3. Ekspor Multer
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // Batas ukuran file 5MB (Bisa disesuaikan jika perlu)
});

module.exports = upload;