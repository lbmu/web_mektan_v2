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
    nama_instansi: '',
    nama_lengkap: '',
    username: '',
    email: '',
    no_hp: '',
    password: '',
    kabupaten: '',
    kecamatan: '',
    desa: ''
});

const isSubmitting = ref(false);
const showPassword = ref(false);

// --- STATE API WILAYAH (EMSIFA) ---
const kabs = ref([]);
const kecs = ref([]);
const desas = ref([]);

const selectedKabId = ref('');
const selectedKecId = ref('');
const selectedDesaId = ref('');
const isLoadingWilayah = ref(false);

// Referensi untuk mengontrol Scroll Panel Kanan dari Panel Kiri
const rightPanel = ref(null);

const forwardScroll = (e) => {
    if (rightPanel.value) {
        rightPanel.value.scrollTop += e.deltaY;
    }
};

// --- LOGIKA CAROUSEL BACKGROUND ---
const currentBg = ref(0);
let bgInterval = null;
const bgImages = [bg1, bg2, bg3];

const toTitleCase = (str) => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const loadKabs = async () => {
    try {
        const res = await axios.get('https://www.emsifa.com/api-wilayah-indonesia/api/regencies/32.json');
        kabs.value = res.data;
    } catch (error) { console.error("Gagal load kabupaten"); }
};

const onKabChange = async () => {
    selectedKecId.value = '';
    selectedDesaId.value = '';
    kecs.value = [];
    desas.value = [];
    if (selectedKabId.value) {
        isLoadingWilayah.value = true;
        try {
            const res = await axios.get(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${selectedKabId.value}.json`);
            kecs.value = res.data;
        } catch (error) {}
        isLoadingWilayah.value = false;
    }
};

const onKecChange = async () => {
    selectedDesaId.value = '';
    desas.value = [];
    if (selectedKecId.value) {
        isLoadingWilayah.value = true;
        try {
            const res = await axios.get(`https://www.emsifa.com/api-wilayah-indonesia/api/villages/${selectedKecId.value}.json`);
            desas.value = res.data;
        } catch (error) {}
        isLoadingWilayah.value = false;
    }
};

onMounted(() => {
    loadKabs(); 
    bgInterval = setInterval(() => {
        currentBg.value = (currentBg.value + 1) % bgImages.length;
    }, 5000);
});

onUnmounted(() => {
    if (bgInterval) clearInterval(bgInterval);
});

// --- LOGIKA REGISTRASI ---
const handleRegister = async () => {
    if (!selectedKabId.value || !selectedKecId.value || !selectedDesaId.value) {
        Swal.fire('Perhatian', 'Mohon lengkapi domisili wilayah operasional (Kabupaten, Kecamatan, Desa).', 'warning');
        return;
    }

    form.value.kabupaten = kabs.value.find(k => k.id === selectedKabId.value)?.name || '';
    form.value.kecamatan = kecs.value.find(k => k.id === selectedKecId.value)?.name || '';
    form.value.desa = desas.value.find(d => d.id === selectedDesaId.value)?.name || '';

    isSubmitting.value = true;
    try {
        const response = await axios.post(`${API_BASE_URL}/users/register`, form.value);
        
        Swal.fire({
            icon: 'success',
            title: 'Pendaftaran Berhasil!',
            text: response.data.message || 'Akun Anda sedang diverifikasi.',
            timer: 2500,
            showConfirmButton: false,
            backdrop: `rgba(15, 23, 42, 0.8)`, 
            color: '#1e293b',
            customClass: {
                popup: 'rounded-4 shadow-lg border-0',
                title: 'text-agri-green fw-bold'
            }
        }).then(() => {
            router.push('/login');
        });
    } catch (error) {
        Swal.fire({
            title: 'Gagal Mendaftar',
            text: error.response?.data?.message || 'Terjadi kesalahan saat terhubung ke server.',
            icon: 'error',
            confirmButtonColor: '#ef4444'
        });
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<template>
    <div class="container-fluid p-0 vh-100 overflow-hidden login-wrapper">
        <div class="row g-0 h-100">
            
            <!-- BAGIAN KIRI: CAROUSEL BACKGROUND (Rasio 60% via col-lg-7) -->
            <div class="col-lg-7 col-md-6 d-none d-md-block position-relative h-100 overflow-hidden bg-dark"
                 @wheel.prevent="forwardScroll">
                 
                <transition-group name="fade" tag="div">
                    <div v-for="(img, index) in bgImages" :key="index"
                        v-show="currentBg === index"
                        class="bg-image-layer"
                        :style="{ backgroundImage: `url(${img})` }">
                    </div>
                </transition-group>
                <div class="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-50"></div>
                
                <div class="position-absolute bottom-0 start-0 p-5 w-100 z-3">
                    <!-- Glass Card dilebarkan menjadi max-width 750px -->
                    <div class="glass-card p-4 interactive-card" style="max-width: 750px;">
                        <div class="d-flex align-items-center mb-3">
                            <div class="badge bg-agri-green px-3 py-2 rounded-pill me-3 shadow-sm">
                                <i class="bi bi-people-fill me-1"></i> Layanan Publik
                            </div>
                            <span class="text-white-50 small fw-bold tracking-wide">PORTAL KELOMPOK TANI</span>
                        </div>
                        <h2 class="fw-bold text-white mb-2 display-6">Bergabung Bersama MyMektan</h2>
                        
                        <!-- Teks warna putih solid dengan text-shadow agar selalu terbaca jelas -->
                        <p class="text-white mb-0 fs-6" style="line-height: 1.7; text-shadow: 0px 1px 3px rgba(0,0,0,0.8);">
                            Daftarkan kelompok tani Anda untuk menikmati kemudahan akses penyewaan alat mesin pertanian secara digital dan transparan.
                        </p>
                    </div>
                </div>
            </div>

            <!-- BAGIAN KANAN: FORMULIR REGISTRASI (Rasio 40% via col-lg-5) -->
            <div ref="rightPanel" class="col-lg-5 col-md-6 d-flex flex-column align-items-center bg-white position-relative h-100 overflow-y-auto shadow-lg z-3 pt-4 pb-5 custom-scrollbar">
                
                <div class="w-100 d-flex justify-content-start px-4 mt-2 mb-3">
                    <RouterLink to="/" class="text-decoration-none text-muted transition-link d-flex align-items-center fw-bold">
                        <i class="bi bi-arrow-left me-2"></i> Beranda
                    </RouterLink>
                </div>

                <!-- Form max-width diperbesar menjadi 520px agar inputan lebih bernapas -->
                <div class="w-100 px-4 px-xl-5" style="max-width: 520px;">
                    
                    <div class="text-center mb-4 mt-2">
                        <h3 class="fw-bolder text-dark mb-1 tracking-tight">Registrasi Akun</h3>
                        <p class="text-muted small">Lengkapi profil administrasi Anda</p>
                    </div>

                    <form @submit.prevent="handleRegister">
                        
                        <!-- 1. DATA INSTANSI & PENANGGUNG JAWAB -->
                        <div class="mb-3 position-relative custom-input-wrapper">
                            <i class="bi bi-building position-absolute input-icon text-muted"></i>
                            <input v-model="form.nama_instansi" type="text" class="form-control custom-input" placeholder="Nama Instansi / Kelompok Tani" required>
                        </div>

                        <div class="mb-3 position-relative custom-input-wrapper">
                            <i class="bi bi-person-vcard position-absolute input-icon text-muted"></i>
                            <input v-model="form.nama_lengkap" type="text" class="form-control custom-input" placeholder="Nama Penanggung Jawab" required>
                        </div>
                        
                        <div class="mb-3 position-relative custom-input-wrapper">
                            <i class="bi bi-whatsapp position-absolute input-icon text-muted"></i>
                            <input v-model="form.no_hp" type="text" class="form-control custom-input" placeholder="No. WhatsApp (Aktif)" required>
                        </div>

                        <!-- 2. DATA KREDENSIAL AKUN -->
                        <div class="mb-3 position-relative custom-input-wrapper">
                            <i class="bi bi-envelope position-absolute input-icon text-muted"></i>
                            <input v-model="form.email" type="email" class="form-control custom-input" placeholder="Alamat Email Valid" required>
                        </div>

                        <div class="mb-3 position-relative custom-input-wrapper">
                            <i class="bi bi-person-badge position-absolute input-icon text-muted"></i>
                            <input v-model="form.username" type="text" class="form-control custom-input" placeholder="Username (Tanpa Spasi)" required>
                        </div>

                        <div class="mb-4 position-relative custom-input-wrapper">
                            <i class="bi bi-key position-absolute input-icon text-muted"></i>
                            <input v-model="form.password" :type="showPassword ? 'text' : 'password'" class="form-control custom-input" placeholder="Buat Password" required>
                            <button type="button" class="btn border-0 position-absolute end-0 top-50 translate-middle-y text-muted me-2" @click="showPassword = !showPassword" tabindex="-1">
                                <i class="bi" :class="showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'"></i>
                            </button>
                        </div>

                        <!-- 3. DATA WILAYAH (EMSIFA) -->
                        <div class="text-center mb-3">
                            <small class="fw-bold text-muted text-uppercase tracking-wide" style="font-size: 0.75rem;">Domisili Kesekretariatan</small>
                            <hr class="mt-1 mb-0 opacity-25">
                        </div>

                        <div class="mb-3 position-relative custom-input-wrapper">
                            <i class="bi bi-geo-alt-fill position-absolute input-icon text-success"></i>
                            <select v-model="selectedKabId" @change="onKabChange" class="form-select custom-input text-secondary" :disabled="isLoadingWilayah" required>
                                <option value="">-- Pilih Kabupaten / Kota --</option>
                                <option v-for="k in kabs" :key="k.id" :value="k.id">{{ toTitleCase(k.name) }}</option>
                            </select>
                        </div>

                        <div class="mb-3 position-relative custom-input-wrapper">
                            <i class="bi bi-geo-fill position-absolute input-icon text-success"></i>
                            <select v-model="selectedKecId" @change="onKecChange" class="form-select custom-input text-secondary" :disabled="!selectedKabId || isLoadingWilayah" required>
                                <option value="">-- Pilih Kecamatan --</option>
                                <option v-for="k in kecs" :key="k.id" :value="k.id">{{ toTitleCase(k.name) }}</option>
                            </select>
                        </div>

                        <div class="mb-4 position-relative custom-input-wrapper">
                            <i class="bi bi-pin-map-fill position-absolute input-icon text-success"></i>
                            <select v-model="selectedDesaId" class="form-select custom-input text-secondary" :disabled="!selectedKecId || isLoadingWilayah" required>
                                <option value="">-- Pilih Desa --</option>
                                <option v-for="d in desas" :key="d.id" :value="d.id">{{ toTitleCase(d.name) }}</option>
                            </select>
                        </div>

                        <button type="submit" class="btn btn-agri-green w-100 fw-bold py-3 mt-2 login-btn shadow-sm" :disabled="isSubmitting || isLoadingWilayah">
                            <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2"></span>
                            {{ isSubmitting ? 'Memproses Data...' : 'Kirim Pendaftaran' }}
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
.bg-agri-green { background-color: #10b981 !important; color: white; }
.text-agri-green { color: #10b981 !important; }
.btn-agri-green { background-color: #10b981; border-color: #10b981; color: white; }
.btn-agri-green:hover:not(:disabled) { 
    background-color: #059669; border-color: #059669; transform: translateY(-2px); 
    box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3) !important; 
}

.bg-image-layer {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background-size: cover; background-position: center;
    transition: transform 10s ease; transform: scale(1.05);
}
.fade-enter-active, .fade-leave-active { transition: opacity 1.5s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.fade-enter-to, .fade-leave-from { opacity: 1; transform: scale(1); }

.glass-card {
    background: rgba(255, 255, 255, 0.08); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 20px;
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2); transition: all 0.4s ease;
}
.interactive-card:hover { background: rgba(255, 255, 255, 0.12); transform: translateY(-5px); border-color: rgba(255, 255, 255, 0.3); }

/* PENYESUAIAN TINGGI INPUT AGAR LEBIH COMPACT */
.custom-input {
    height: 46px; 
    border: 2px solid #e2e8f0; border-radius: 10px;
    padding-left: 2.8rem !important; padding-right: 2.8rem !important; 
    font-size: 0.9rem; font-weight: 600; color: #1e293b; transition: all 0.3s ease;
}
.custom-input:focus { border-color: #10b981; box-shadow: 0 0 0 0.25rem rgba(16, 185, 129, 0.15); background-color: #fff; }
.custom-input::placeholder { color: #94a3b8; font-weight: 500; }

.input-icon { left: 1rem; top: 50%; transform: translateY(-50%); font-size: 1.15rem; z-index: 10; }
select.custom-input { appearance: none; background-image: none; cursor: pointer; }

.login-btn { border-radius: 12px; transition: all 0.3s; letter-spacing: 0.5px; }
.tracking-wide { letter-spacing: 2px; }
.tracking-tight { letter-spacing: -0.5px; }
.transition-link { transition: color 0.3s ease; }
.transition-link:hover { color: #059669 !important; text-decoration: underline !important; }

/* Kustomisasi Scrollbar Kanan agar rapi */
.custom-scrollbar::-webkit-scrollbar { width: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(203, 213, 225, 0.8); border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 1); }
</style>