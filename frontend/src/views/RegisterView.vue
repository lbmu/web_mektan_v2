<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import Swal from 'sweetalert2';

import bg1 from '../assets/images/bg-mektan-1.jpg';
import bg2 from '../assets/images/bg-mektan-2.jpg';
import bg3 from '../assets/images/bg-mektan-3.jpg';

const router = useRouter();
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const form = ref({
    username: '',
    email: '',
    nama_lengkap: '',
    no_hp: '',
    password: ''
});

const isSubmitting = ref(false);
const showPassword = ref(false);

// --- LOGIKA CAROUSEL BACKGROUND ---
const currentBg = ref(0);
let bgInterval = null;

const bgImages = [bg1, bg2, bg3];

onMounted(() => {
    bgInterval = setInterval(() => {
        currentBg.value = (currentBg.value + 1) % bgImages.length;
    }, 5000);
});

onUnmounted(() => {
    if (bgInterval) clearInterval(bgInterval);
});

// --- LOGIKA REGISTRASI ---
const handleRegister = async () => {
    isSubmitting.value = true;
    try {
        await axios.post(`${API_BASE_URL}/users/register`, form.value);
        
        Swal.fire({
            icon: 'success',
            title: 'Pendaftaran Berhasil!',
            text: 'Akun Anda sudah aktif. Silakan masuk menggunakan akun tersebut.',
            timer: 2500,
            showConfirmButton: false,
            backdrop: `rgba(15, 23, 42, 0.8)`, 
            color: '#1e293b',
            customClass: {
                popup: 'rounded-4 shadow-lg border-0',
                title: 'text-agri-green fw-bold'
            },
            showClass: { popup: 'animate__animated animate__bounceInDown' },
            hideClass: { popup: 'animate__animated animate__bounceOutUp' }
        }).then(() => {
            router.push('/login');
        });
    } catch (error) {
        Swal.fire({
            title: 'Gagal Mendaftar',
            text: error.response?.data?.message || 'Terjadi kesalahan saat terhubung ke server.',
            icon: 'error',
            confirmButtonColor: '#ef4444',
            showClass: { popup: 'animate__animated animate__wobble' },
            hideClass: { popup: 'animate__animated animate__zoomOut' }
        });
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<template>
    <div class="container-fluid p-0 login-wrapper">
        <div class="row g-0 vh-100">
            
            <!-- BAGIAN KIRI: CAROUSEL BACKGROUND -->
            <div class="col-lg-7 col-md-6 d-none d-md-block position-relative overflow-hidden bg-dark">
                
                <transition-group name="fade" tag="div">
                    <div v-for="(img, index) in bgImages" :key="index"
                        v-show="currentBg === index"
                        class="bg-image-layer"
                        :style="{ backgroundImage: `url(${img})` }">
                    </div>
                </transition-group>

                <div class="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-50"></div>

                <div class="position-absolute bottom-0 start-0 p-5 w-100 z-3">
                    <div class="glass-card p-4 interactive-card">
                        <div class="d-flex align-items-center mb-3">
                            <div class="badge bg-agri-green px-3 py-2 rounded-pill me-3 shadow-sm">
                                <i class="bi bi-people-fill me-1"></i> Layanan Publik
                            </div>
                            <span class="text-white-50 small fw-bold tracking-wide">PORTAL KELOMPOK TANI</span>
                        </div>
                        <h2 class="fw-bold text-white mb-2">Bergabung Bersama MyMektan</h2>
                        <p class="text-white-50 mb-0" style="line-height: 1.6;">
                            Daftarkan kelompok tani Anda untuk menikmati kemudahan akses penyewaan alat mesin pertanian secara digital dan transparan.
                        </p>
                    </div>
                </div>
            </div>

            <!-- BAGIAN KANAN: FORMULIR REGISTRASI -->
            <div class="col-lg-5 col-md-6 d-flex flex-column align-items-center justify-content-center bg-white position-relative overflow-y-auto">
                
                <!-- TOMBOL KEMBALI KE BERANDA -->
                <RouterLink to="/" class="position-absolute top-0 start-0 m-4 text-decoration-none text-muted transition-link d-flex align-items-center fw-bold" style="z-index: 10;">
                    <i class="bi bi-arrow-left me-2"></i> Beranda
                </RouterLink>

                <div class="w-100 px-4 px-lg-5 py-5 mt-4" style="max-width: 480px;">
                    
                    <div class="text-center mb-4">
                        <h3 class="fw-bolder text-dark mb-1 tracking-tight">Buat Akun</h3>
                        <p class="text-muted small">Lengkapi formulir di bawah untuk mendaftar</p>
                    </div>

                    <form @submit.prevent="handleRegister">
                        
                        <!-- Input Nama -->
                        <div class="mb-3 position-relative custom-input-wrapper">
                            <i class="bi bi-person-vcard position-absolute input-icon text-muted"></i>
                            <input v-model="form.nama_lengkap" type="text" class="form-control custom-input" placeholder="Nama Lengkap / Nama Kelompok" required>
                        </div>

                        <!-- Input Username -->
                        <div class="mb-3 position-relative custom-input-wrapper">
                            <i class="bi bi-person-badge position-absolute input-icon text-muted"></i>
                            <input v-model="form.username" type="text" class="form-control custom-input" placeholder="Username (Tanpa Spasi)" required>
                        </div>

                        <!-- Input Email -->
                        <div class="mb-3 position-relative custom-input-wrapper">
                            <i class="bi bi-envelope position-absolute input-icon text-muted"></i>
                            <input v-model="form.email" type="email" class="form-control custom-input" placeholder="Alamat Email" required>
                        </div>

                        <!-- Input WhatsApp -->
                        <div class="mb-3 position-relative custom-input-wrapper">
                            <i class="bi bi-whatsapp position-absolute input-icon text-muted"></i>
                            <input v-model="form.no_hp" type="text" class="form-control custom-input" placeholder="No. WhatsApp" required>
                        </div>

                        <!-- Input Password -->
                        <div class="mb-4 position-relative custom-input-wrapper">
                            <i class="bi bi-key position-absolute input-icon text-muted"></i>
                            <input v-model="form.password" :type="showPassword ? 'text' : 'password'" class="form-control custom-input" placeholder="Buat Password" required>
                            
                            <button type="button" class="btn border-0 position-absolute end-0 top-50 translate-middle-y text-muted me-2" 
                                    @click="showPassword = !showPassword" tabindex="-1">
                                <i class="bi" :class="showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'"></i>
                            </button>
                        </div>

                        <button type="submit" class="btn btn-agri-green w-100 btn-lg fw-bold py-3 login-btn shadow-sm" :disabled="isSubmitting">
                            <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2"></span>
                            {{ isSubmitting ? 'Memproses Data...' : 'Daftar Sekarang' }}
                        </button>
                    </form>

                    <div class="text-center mt-4 pt-4 border-top">
                        <small class="text-muted d-block mb-2" style="font-size: 0.9rem;">
                            Sudah punya akun? 
                            <RouterLink to="/login" class="text-agri-green fw-bold text-decoration-none transition-link">Masuk di sini</RouterLink>
                        </small>
                    </div>

                </div>

            </div>
        </div>
    </div>
</template>

<style scoped>
/* DEKLARASI WARNA AGRI-TECH GREEN */
.bg-agri-green { background-color: #10b981 !important; color: white; }
.text-agri-green { color: #10b981 !important; }
.btn-agri-green { 
    background-color: #10b981; 
    border-color: #10b981; 
    color: white; 
}
.btn-agri-green:hover:not(:disabled) { 
    background-color: #059669; 
    border-color: #059669; 
    transform: translateY(-2px); 
    box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3) !important; 
}

/* 1. LAYER GAMBAR BACKGROUND (CAROUSEL) */
.bg-image-layer {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background-size: cover; background-position: center;
    transition: transform 10s ease; transform: scale(1.05);
}
.fade-enter-active, .fade-leave-active { transition: opacity 1.5s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.fade-enter-to, .fade-leave-from { opacity: 1; transform: scale(1); }

/* 2. GLASSMORPHISM CARD */
.glass-card {
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 20px;
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2); transition: all 0.4s ease;
}
.interactive-card:hover {
    background: rgba(255, 255, 255, 0.12); transform: translateY(-5px);
    border-color: rgba(255, 255, 255, 0.3);
}

/* 3. UX ENHANCEMENTS (STANDARD MODERN INPUT) */
.custom-input {
    height: 55px; /* Sedikit lebih ramping dibanding Login agar 5 form muat */
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    padding-left: 3rem !important;  
    padding-right: 3rem !important; 
    font-size: 1rem;
    font-weight: 600;
    color: #1e293b;
    transition: all 0.3s ease;
}

.custom-input:focus {
    border-color: #10b981;
    box-shadow: 0 0 0 0.25rem rgba(16, 185, 129, 0.15);
    background-color: #fff;
}

.custom-input::placeholder {
    color: #94a3b8;
    font-weight: 500;
}

.input-icon {
    left: 1.2rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 1.25rem;
    z-index: 10;
}

.login-btn { border-radius: 12px; transition: all 0.3s; letter-spacing: 0.5px; }

.tracking-wide { letter-spacing: 2px; }
.tracking-tight { letter-spacing: -0.5px; }
.transition-link { transition: color 0.3s ease; }
.transition-link:hover { color: #059669 !important; text-decoration: underline !important; }

/* Tambahan agar scroll bar tidak merusak desain jika layar laptop terlalu kecil */
.overflow-y-auto::-webkit-scrollbar { width: 6px; }
.overflow-y-auto::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
</style>