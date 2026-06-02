<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import Swal from 'sweetalert2';

import bg1 from '../assets/images/bg-mektan-1.jpg';
import bg2 from '../assets/images/bg-mektan-2.jpg';
import bg3 from '../assets/images/bg-mektan-3.jpg';

const router = useRouter();
const identifier = ref('');
const password = ref('');
const loading = ref(false);
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

// --- LOGIKA LOGIN & SWEETALERT CUSTOM ANIMATION ---
const handleLogin = async () => {
    if (!identifier.value || !password.value) {
        // Swal Peringatan Custom
        Swal.fire({
            title: 'Ups, Ada yang Kosong!',
            text: 'Mohon isi Username/Email dan Password Anda.',
            icon: 'warning',
            confirmButtonColor: '#10b981', // Agri-Tech Green
            showClass: { popup: 'animate__animated animate__headShake' },
            hideClass: { popup: 'animate__animated animate__fadeOutUp' }
        });
        return;
    }

    loading.value = true;

    try {
        const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/users/login`, {
            identifier: identifier.value,
            password: password.value
        });

        if (response.data.status) {
            const userData = response.data.data;
            localStorage.setItem('user', JSON.stringify(userData));

            // Swal Berhasil Custom dengan Animate.css
            Swal.fire({
                icon: 'success',
                title: 'Autentikasi Berhasil',
                text: `Selamat datang kembali, ${userData.nama || userData.username || 'Admin Mektan'}!`,
                timer: 2000,
                showConfirmButton: false,
                backdrop: `rgba(15, 23, 42, 0.8)`, // Latar belakang gelap elegan (Dark Slate)
                color: '#1e293b',
                customClass: {
                    popup: 'rounded-4 shadow-lg border-0',
                    title: 'text-agri-green fw-bold'
                },
                showClass: { popup: 'animate__animated animate__bounceInDown' },
                hideClass: { popup: 'animate__animated animate__bounceOutUp' }
            }).then(() => {
                window.location.href = '/';
            });
        }
    } catch (error) {
        const pesan = error.response?.data?.message || 'Terjadi kesalahan saat login.';
        Swal.fire({
            title: 'Akses Ditolak',
            text: pesan,
            icon: 'error',
            confirmButtonColor: '#ef4444',
            showClass: { popup: 'animate__animated animate__wobble' },
            hideClass: { popup: 'animate__animated animate__zoomOut' }
        });
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <div class="container-fluid p-0 login-wrapper">
        <div class="row g-0 vh-100">
            
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
                                <i class="bi bi-geo-alt-fill me-1"></i> Jawa Barat
                            </div>
                            <span class="text-white-50 small fw-bold tracking-wide">SISTEM MONITORING ARMADA</span>
                        </div>
                        <h2 class="fw-bold text-white mb-2">UPTD Balai Pengembangan Mekanisasi Pertanian</h2>
                        <p class="text-white-50 mb-0" style="line-height: 1.6;">
                            Berinovasi untuk ketahanan pangan melalui digitalisasi, pemantauan presisi IoT, dan manajemen armada traktor terpadu secara real-time.
                        </p>
                    </div>
                </div>
            </div>

            <div class="col-lg-5 col-md-6 d-flex flex-column align-items-center justify-content-center bg-white position-relative">
                
                <div class="w-100 px-4 px-lg-5" style="max-width: 450px;">
                    
                    <div class="text-center mb-4">
                        
                        <div class="lottie-container mx-auto mb-2" :class="{ 'is-loading': loading }">
                            <lottie-player 
                                src="https://lottie.host/70b58214-fe9b-4901-8550-92fd833b710e/APxATkUiMW.json" 
                                background="transparent" 
                                speed="1" 
                                style="width: 145px; height: 145px;" 
                                loop 
                                autoplay>
                            </lottie-player>
                        </div>

                        <h3 class="fw-bolder text-dark mb-1 tracking-tight">MyMektan</h3>
                        <p class="text-muted small">Masukan kredensial Anda untuk melanjutkan</p>
                    </div>

                    <form @submit.prevent="handleLogin">
                        
                        <div class="mb-4 position-relative custom-input-wrapper">
                            <i class="bi bi-person position-absolute input-icon text-muted"></i>
                            <input v-model="identifier" type="text" class="form-control custom-input" placeholder="Username / Email" required>
                        </div>

                        <div class="mb-4 position-relative custom-input-wrapper">
                            <i class="bi bi-key position-absolute input-icon text-muted"></i>
                            <input v-model="password" :type="showPassword ? 'text' : 'password'" class="form-control custom-input" placeholder="Password" required>
                            
                            <button type="button" class="btn border-0 position-absolute end-0 top-50 translate-middle-y text-muted me-2" 
                                    @click="showPassword = !showPassword" tabindex="-1">
                                <i class="bi" :class="showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'"></i>
                            </button>
                        </div>

                        <button type="submit" class="btn btn-agri-green w-100 btn-lg fw-bold py-3 login-btn shadow-sm" :disabled="loading">
                            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                            {{ loading ? 'Mengautentikasi...' : 'Login' }}
                        </button>
                    </form>

                    <div class="text-center mt-5">
                        <small class="text-muted d-block mb-1">Butuh bantuan akses?</small>
                        <a href="#" class="text-agri-green text-decoration-none fw-bold small transition-link">Hubungi Super Admin</a>
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
    background-color: #059669; /* Sedikit lebih gelap saat di-hover */
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

/* 3. LOTTIE CONTAINER */
.lottie-container {
    display: flex; justify-content: center; align-items: center;
    transition: all 0.3s ease;
}
.is-loading .lottie-container { transform: scale(1.1); }

/* 4. UX ENHANCEMENTS (STANDARD MODERN INPUT) */
.custom-input {
    height: 60px; 
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    
    /* KUNCI PERBAIKAN: Gunakan !important untuk memaksa Bootstrap minggir */
    padding-left: 3rem !important;  /* Jarak kiri untuk ikon orang/kunci */
    padding-right: 3rem !important; /* Jarak kanan untuk ikon mata (password) */
    
    font-size: 1.05rem;
    font-weight: 600;
    color: #1e293b;
    transition: all 0.3s ease;
}

.custom-input:focus {
    border-color: #10b981;
    box-shadow: 0 0 0 0.25rem rgba(16, 185, 129, 0.15);
    background-color: #fff;
}

/* Mengatur warna teks bayangan (placeholder) */
.custom-input::placeholder {
    color: #94a3b8;
    font-weight: 500;
}

/* Mengatur posisi ikon di dalam input box agar pas di tengah */
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
</style>