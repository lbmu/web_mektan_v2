<script setup>
import { ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

// Terima status 'close' dari Layout (Parent)
const props = defineProps({
    isClosed: Boolean
});

const emit = defineEmits(['toggle-sidebar']);

const activeMenu = ref(null);

const toggleSubMenu = (menuName) => {
    if (props.isClosed) {
        emit('toggle-sidebar'); 
    }
    activeMenu.value = activeMenu.value === menuName ? null : menuName;
};

watch(() => props.isClosed, (newVal) => {
    if (newVal === true) {
        activeMenu.value = null;
    }
});
</script>


<template>
    <div class="d-flex flex-column flex-shrink-0 p-3 h-100">
    
        <div class="d-flex align-items-center mb-3 mb-md-0 text-white text-decoration-none">
            <span v-if="!isClosed" class="fs-4 fw-bold me-auto fade-in">🚜 Si-Alsintan</span>
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
        <ul class="nav nav-pills flex-column mb-auto">
            <li class="nav-item">
                <RouterLink to="/" class="nav-link d-flex align-items-center" :class="{ 'justify-content-center': isClosed }" active-class="active">
                    <i class="bi bi-bar-chart-fill fs-5"></i>
                    <span v-if="!isClosed" class="ms-3 fade-in">Dashboard</span>
                </RouterLink>
            </li>
            <li>
                <RouterLink to="/aset" class="nav-link d-flex align-items-center" :class="{ 'justify-content-center': isClosed }" active-class="active">
                    <i class="bi bi-tools fs-5"></i>
                    <span v-if="!isClosed" class="ms-3 fade-in">Manajemen Aset</span>
                </RouterLink>
            </li>
            <li>
                <RouterLink to="/monitoring" class="nav-link d-flex align-items-center" :class="{ 'justify-content-center': isClosed }" active-class="active">
                    <i class="bi bi-globe-americas fs-5"></i>
                    <span v-if="!isClosed" class="ms-3 fade-in">Monitoring Peta</span>
                </RouterLink>
            </li>
            <li>
                <RouterLink to="/estimasi" class="nav-link d-flex align-items-center" :class="{ 'justify-content-center': isClosed }" active-class="active">
                    <i class="bi bi-calculator fs-5"></i>
                    <span v-if="!isClosed" class="ms-3 fade-in">
                    Estimasi Lahan
                    </span>
                </RouterLink>
            </li>
        </ul>
    
        <hr class="text-white-50">
    
        <div class="dropdown" :class="{ 'text-center': isClosed }">
            <a href="#" class="d-flex align-items-center text-white text-decoration-none dropdown-toggle" 
                :class="{ 'justify-content-center': isClosed }"
                id="dropdownUser1" data-bs-toggle="dropdown" aria-expanded="false">
        
                <img src="https://github.com/mdo.png" alt="" width="32" height="32" class="rounded-circle">
        
                <strong v-if="!isClosed" class="ms-2 fade-in">Admin</strong>
            </a>
            <ul class="dropdown-menu dropdown-menu-dark text-small shadow" aria-labelledby="dropdownUser1">
                <li><a class="dropdown-item" href="#">Logout</a></li>
            </ul>
        </div>

    </div>
</template>


<style scoped>
/* --- LOGIKA TAMPILAN (ADAPTASI DARI REFERENSI) --- */

/* 1. Header Area */
/* Kita set min-width agar layout tidak berantakan saat transisi */
.header-area {
    min-width: 200px; 
    overflow: hidden;
}

/* 2. Tombol Toggle */
.toggle-btn {
    width: 30px; 
    height: 30px;
    cursor: pointer;
}

/* 3. Rotasi Ikon Panah (Fitur Referensi) */
.transition-icon {
    transition: transform 0.3s ease;
}
.rotate-180 {
    transform: rotate(180deg);
}

/* 4. Ikon Menu */
/* Penting: flex-shrink-0 agar ikon tidak mengecil/gepeng saat sidebar menutup */
.icon-fixed {
    min-width: 24px;
    text-align: center;
}

/* 5. Teks Menu */
/* Transisi opacity agar teks muncul/hilang halus */
.menu-text, .logo-text {
    transition: opacity 0.2s;
  white-space: nowrap; /* Mencegah teks turun ke bawah */
}

/* Style Active Link (Bootstrap Override) */
.nav-link.active {
    background-color: #0d6efd !important;
}
.nav-link:hover {
    background-color: rgba(255,255,255,0.1);
}
</style>