<script setup>
import { onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import Swal from 'sweetalert2';

const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL;

// Terima status 'close' dari Layout (Parent)
const props = defineProps({
    isClosed: Boolean
});

const emit = defineEmits(['toggle-sidebar']);

const activeMenu = ref(null);
const userName = ref('Admin');
const userPhoto = ref(null);

const userRole = ref('');

// Fungsi Toggle (Tidak berubah)
const toggleSubMenu = (menuName) => {
    if (props.isClosed) {
        emit('toggle-sidebar'); 
    }
    activeMenu.value = activeMenu.value === menuName ? null : menuName;
};

// --- [PERBAIKAN 1: Logic Foto Profil] ---
onMounted(() => {
    const session = localStorage.getItem('user');
    if (session) {
        try {
            const userData = JSON.parse(session);
            userName.value = userData.nama || 'Admin';

            userRole.value = userData.role || 'admin';

            // Cek 'foto' (sesuai screenshot localStorage Anda) ATAU 'foto_profil' (untuk jaga-jaga)
            const fotoFilename = userData.foto || userData.foto_profil;

            if (fotoFilename) {
                userPhoto.value = `${IMAGE_BASE_URL}/profiles/${fotoFilename}`;
            } else {
                userPhoto.value = `https://ui-avatars.com/api/?name=${userName.value}&background=0D6EFD&color=fff`;
            }
        } catch (e) {
            console.error("Gagal parsing user data");
        }
    }
});  

// Fungsi Logout (Tidak berubah)
const handleLogout = () => {
    Swal.fire({
        title: 'Konfirmasi Logout',
        text: 'Apakah Anda yakin ingin logout?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Logout',
        cancelButtonText: 'Batal'
    }) .then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('user');
            
            Swal.fire({
                icon: 'success',
                title: 'Logout Berhasil',
                timer: 1000,
                showConfirmButton: false
            }).then(() => {
                window.location.href = '/login';
            });
        }
    });
};

watch(() => props.isClosed, (newVal) => {
    if (newVal === true) {
        activeMenu.value = null;
    }
});
</script>

<template>
    <div class="d-flex flex-column flex-shrink-0 p-3 h-100 sidebar-container">
    
        <div class="d-flex align-items-center mb-3 mb-md-0 text-white text-decoration-none">
            <span v-if="!isClosed" class="fs-4 fw-bold me-auto fade-in text-nowrap">🚜 Si-Alsintan</span>
            <button 
                @click="$emit('toggle-sidebar')" 
                class="btn btn-dark border-0 p-1 d-flex align-items-center justify-content-center"
                :class="isClosed ? 'mx-auto' : 'ms-auto'"
                style="width: 30px; height: 30px;">
                <i class="bi bi-chevron-left transition-icon" 
                :class="{ 'rotate-180': isClosed }"></i>
            </button>
        </div>
    
        <hr class="text-white-50"> 
        
        <ul class="nav nav-pills flex-column mb-auto overflow-hidden">
            <li class="nav-item">
                <RouterLink to="/" class="nav-link d-flex align-items-center" :class="{ 'justify-content-center': isClosed }" active-class="active">
                    <i class="bi bi-bar-chart-fill fs-5 flex-shrink-0"></i>
                    <span v-if="!isClosed" class="ms-3 fade-in text-nowrap">Home</span>
                </RouterLink>
            </li>
            <li>
                <RouterLink to="/aset" class="nav-link d-flex align-items-center" :class="{ 'justify-content-center': isClosed }" active-class="active">
                    <i class="bi bi-tools fs-5 flex-shrink-0"></i>
                    <span v-if="!isClosed" class="ms-3 fade-in text-nowrap">Manajemen Aset</span>
                </RouterLink>
            </li>
            <li>
                <RouterLink to="/monitoring" class="nav-link d-flex align-items-center" :class="{ 'justify-content-center': isClosed }" active-class="active">
                    <i class="bi bi-globe-americas fs-5 flex-shrink-0"></i>
                    <span v-if="!isClosed" class="ms-3 fade-in text-nowrap">Monitoring Peta</span>
                </RouterLink>
            </li>
            <li>
                <RouterLink to="/estimasi" class="nav-link d-flex align-items-center" :class="{ 'justify-content-center': isClosed }" active-class="active">
                    <i class="bi bi-calculator fs-5 flex-shrink-0"></i>
                    <span v-if="!isClosed" class="ms-3 fade-in text-nowrap">
                    Estimasi Lahan
                    </span>
                </RouterLink>
            </li>

            <li v-if="userRole === 'super_admin'" class="mt-4 pt-2 border-top border-secondary">
                <small v-if="!isClosed" class="text-white-50 ms-3 fw-bold tracking-wide" style="font-size: 0.7rem;">RUANG HARDWARE</small>
                <RouterLink to="/developer" class="nav-link d-flex align-items-center mt-1 text-warning" :class="{ 'justify-content-center': isClosed }" active-class="active">
                    <i class="bi bi-terminal-dash fs-5 flex-shrink-0"></i>
                    <span v-if="!isClosed" class="ms-3 fade-in text-nowrap fw-bold">Developer Area</span>
                </RouterLink>
            </li>
        </ul>
    
        <hr class="text-white-50">
    
        <div class="dropdown" :class="{ 'text-center': isClosed, 'dropend': isClosed }">
            
            <a href="#" class="d-flex align-items-center text-white text-decoration-none dropdown-toggle" 
                :class="{ 'justify-content-center': isClosed }"
                id="dropdownUser1" data-bs-toggle="dropdown" aria-expanded="false">
        
                <img :src="userPhoto" alt="Profile" width="32" height="32" class="rounded-circle object-fit-cover border border-secondary">
        
                <strong v-if="!isClosed" class="ms-2 fade-in text-nowrap">{{ userName }}</strong>
            </a>
            
            <ul class="dropdown-menu dropdown-menu-dark text-small shadow"
                aria-labelledby="dropdownUser1" 
                :class="{ 'fixed-menu': isClosed }">
                <li>
                    <RouterLink to="/profile" class="dropdown-item">Profil Saya</RouterLink>
                </li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item" href="#" @click.prevent="handleLogout">Logout</a></li>
            </ul>
        </div>

    </div>
</template>

<style scoped>
/* 1. Wrapper Utama: Kunci agar dropdown melayang di atas konten lain */
.sidebar-wrapper {
    transition: width 0.3s ease;
    overflow: visible !important; /* Biarkan dropdown keluar batas */
    position: relative;
    z-index: 1050; /* Z-Index tinggi agar di atas dashboard */
}

/* 2. Rotasi Icon Panah */
.transition-icon { transition: transform 0.3s ease; }
.rotate-180 { transform: rotate(180deg); }

/* 3. Animasi Text Muncul */
.fade-in { animation: fadeIn 0.4s; }
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

/* 4. Mencegah Teks Turun Baris */
.text-nowrap { white-space: nowrap; }

/* SOLUSI DROPDOWN TERPOTONG */
.fixed-menu {
    position: fixed !important;
    left: 80px !important; /* Sesuaikan dengan lebar sidebar saat tertutup */
    bottom: 20px !important; 
    top: auto !important;
    transform: none !important;
    margin-left: 10px;
    z-index: 9999 !important; /* Paksa muncul paling depan */
}
</style>