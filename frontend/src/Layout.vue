<script setup>
import { ref } from 'vue';
import Sidebar from './components/Sidebar.vue';
import { RouterView } from 'vue-router';

const isClosed = ref(false);
const handleToggle = () => {
    isClosed.value = !isClosed.value;
    console.log('Sidebar is now', isClosed.value);
};

</script>

<template>
    <div class="app-container">
        <div class="sidebar-wrapper" :class="{ 'closed': isClosed }">
            <Sidebar 
                :isClosed="isClosed"
                @toggle-sidebar="handleToggle"
            />
        </div>

        <main class="content-wrapper" :class="{ 'collapsed': isClosed }">
            <RouterView /> 
        </main>
        
    </div>
</template>     

<style scoped>
/* 1. Kunci Sidebar di kiri layar (Fixed Positioning) */
.sidebar-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: 260px; /* Lebar normal sidebar saat terbuka */
    background-color: #1e293b; /* Warna gelap background sidebar */
    transition: width 0.3s ease; /* Animasi transisi mulus */
    z-index: 1050; /* Pastikan selalu berada di atas elemen lain */
    overflow-x: hidden;
}

/* Lebar sidebar saat ditutup (minimize) */
.sidebar-wrapper.closed {
    width: 80px;
}

/* 2. Atur Konten Utama agar terdorong sejajar dengan sidebar */
.content-wrapper {
    margin-left: 260px;
    /* KUNCI PERBAIKAN: Paksa lebar agar ngepas dengan sisa layar */
    width: calc(100% - 260px); 
    min-height: 100vh;
    /* Animasikan baik margin maupun perubaharan lebarnya */
    transition: margin-left 0.3s ease, width 0.3s ease; 
    background-color: #f8f9fa;
    overflow-x: hidden; /* Mencegah munculnya scrollbar bawah */
}

/* 3. KUNCI PERBAIKAN: Tarik konten ke kiri saat sidebar ditutup */
.content-wrapper.collapsed {
    margin-left: 80px;
    /* KUNCI PERBAIKAN: Lebar otomatis melar mengikuti sisa layar */
    width: calc(100% - 80px);
}
</style>