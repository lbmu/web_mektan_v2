<script setup>
import { onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import Swal from 'sweetalert2';

const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL;

const props = defineProps({
    isClosed: Boolean
});

const emit = defineEmits(['toggle-sidebar']);

const activeMenu = ref(null);
const userName = ref('Admin');
const userPhoto = ref(null);
const userRole = ref('');

onMounted(() => {
    const session = sessionStorage.getItem('user');
    if (session) {
        try {
            const userData = JSON.parse(session);
            userName.value = userData.nama || 'Admin';
            userRole.value = userData.role || 'admin';

            const fotoFilename = userData.foto || userData.foto_profil;

            if (fotoFilename) {
                // KUNCI CLOUDINARY: Cek apakah nama file diawali dengan 'http' (berarti link Cloudinary)
                if (fotoFilename.startsWith('http')) {
                    userPhoto.value = fotoFilename; 
                } else {
                    // Fallback: Jika masih data lama (hanya nama file), gunakan URL lokal
                    userPhoto.value = `${IMAGE_BASE_URL}/profiles/${fotoFilename}`;
                }
            } else {
                userPhoto.value = `https://ui-avatars.com/api/?name=${userName.value}&background=0D6EFD&color=fff`;
            }
        } catch (e) {
            console.error("Gagal parsing user data");
        }
    }
});  

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
    }).then((result) => {
        if (result.isConfirmed) {
            // Hapus data pengguna dan lempar ke halaman login jika dikonfirmasi
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('token');
            window.location.href = '/login';
        }
    });
};

watch(() => props.isClosed, (newVal) => {
    if (newVal === true) activeMenu.value = null;
});
</script>

<template>
    <div class="d-flex flex-column flex-shrink-0 p-3 h-100 sidebar-container" :class="{ 'sidebar-is-closed': isClosed }">
    
        <div class="d-flex align-items-center mb-3 mb-md-0 px-2 w-100">
            <RouterLink 
                v-if="!isClosed" 
                to="/" 
                class="d-flex align-items-center text-white text-decoration-none me-auto fade-in custom-brand-hover">
                
                <img src="/logo-mektan.png" alt="Logo Kementan" width="36" height="36" class="rounded-circle border border-2 border-white me-2 shadow-sm" style="object-fit: cover;">
                <span class="fs-4 fw-bold text-nowrap tracking-wide">MyMektan</span>
            </RouterLink>

            <button 
                @click="$emit('toggle-sidebar')" 
                class="btn btn-dark border-0 p-1 d-flex align-items-center justify-content-center"
                :class="isClosed ? 'mx-auto' : 'ms-auto'"
                style="width: 30px; height: 30px;">
                <i class="bi bi-chevron-left transition-icon" :class="{ 'rotate-180': isClosed }"></i>
            </button>
        </div>
    
        <hr class="text-white-50 mx-2 mt-3"> 
        
        <ul class="nav nav-pills flex-column mb-auto px-0 w-100">
            
            <li class="nav-item">
                <RouterLink to="/" class="nav-link custom-nav-link d-flex align-items-center" :class="{ 'justify-content-center': isClosed }" active-class="active">
                    <i class="bi bi-bar-chart-fill fs-5 flex-shrink-0"></i>
                    <span v-if="!isClosed" class="ms-3 fade-in text-nowrap">Home</span>
                </RouterLink>
            </li>
            
            <li class="nav-item">
                <RouterLink to="/aset" class="nav-link custom-nav-link d-flex align-items-center" :class="{ 'justify-content-center': isClosed }" active-class="active">
                    <i class="bi bi-tools fs-5 flex-shrink-0"></i>
                    <span v-if="!isClosed" class="ms-3 fade-in text-nowrap">Manajemen Aset</span>
                </RouterLink>
            </li>
            
            <li class="nav-item">
                <RouterLink to="/monitoring" class="nav-link custom-nav-link d-flex align-items-center" :class="{ 'justify-content-center': isClosed }" active-class="active">
                    <i class="bi bi-globe-americas fs-5 flex-shrink-0"></i>
                    <span v-if="!isClosed" class="ms-3 fade-in text-nowrap">Monitoring Peta</span>
                </RouterLink>
            </li>
            
            <li class="nav-item">
                <RouterLink to="/estimasi" class="nav-link custom-nav-link d-flex align-items-center" :class="{ 'justify-content-center': isClosed }" active-class="active">
                    <i class="bi bi-calculator fs-5 flex-shrink-0"></i>
                    <span v-if="!isClosed" class="ms-3 fade-in text-nowrap">Estimasi Lahan</span>
                </RouterLink>
            </li>

        </ul>
    
        <hr class="text-white-50 mx-2">
    
        <div class="dropdown mx-2" :class="{ 'text-center': isClosed, 'dropend': isClosed }">
            <a href="#" class="d-flex align-items-center text-white text-decoration-none dropdown-toggle" 
                :class="{ 'justify-content-center': isClosed }"
                id="dropdownUser1" data-bs-toggle="dropdown" aria-expanded="false">
                <img :src="userPhoto" alt="Profile" width="32" height="32" class="rounded-circle object-fit-cover border border-secondary">
                <strong v-if="!isClosed" class="ms-2 fade-in text-nowrap">{{ userName }}</strong>
            </a>
            
            <ul class="dropdown-menu dropdown-menu-dark text-small shadow"
                aria-labelledby="dropdownUser1" 
                :class="{ 'fixed-menu': isClosed }">
                <li><RouterLink to="/profile" class="dropdown-item">Profil Saya</RouterLink></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item" href="#" @click.prevent="handleLogout">Logout</a></li>
            </ul>
        </div>

    </div>
</template>

<style scoped>
/* ========================================= */
/* KUNCI UI SIMETRIS                         */
/* ========================================= */

.custom-nav-link {
    border-radius: 8px !important;  
    margin: 4px 1px;               
    color: #e9ecef;
    transition: all 0.2s ease-in-out;
}

.sidebar-is-closed .custom-nav-link {
    margin: 4px auto !important;    
    padding-left: 0.8rem;           
    padding-right: 0.8rem;          
    width: max-content;             
}

.custom-nav-link:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: #ffffff;
}

.nav-pills .nav-link.active, .nav-pills .show > .nav-link {
    background-color: #0d6efd !important;
    color: #ffffff !important;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2); 
}

/* ========================================= */
/* UTILITY CLASSES                           */
/* ========================================= */

.sidebar-container {
    background-color: inherit; 
    z-index: 1050;
}

.transition-icon { transition: transform 0.3s ease; }
.rotate-180 { transform: rotate(180deg); }

.fade-in { animation: fadeIn 0.3s ease-in-out; }
@keyframes fadeIn {
    from { opacity: 0; transform: translateX(-5px); }
    to { opacity: 1; transform: translateX(0); }
}

.text-nowrap { white-space: nowrap; }

/* Efek Hover untuk Area Logo & Brand */
.custom-brand-hover {
    transition: opacity 0.2s ease-in-out;
}
.custom-brand-hover:hover {
    opacity: 0.8;
}

.fixed-menu {
    position: fixed !important;
    left: 80px !important; 
    bottom: 20px !important; 
    top: auto !important;
    transform: none !important;
    margin-left: 10px;
    z-index: 9999 !important; 
}
</style>