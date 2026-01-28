<script setup>
import Sidebar from './components/Sidebar.vue';
import { RouterView } from 'vue-router';
</script>

<template>
    <div class="app-container">
        <div class="sidebar-wrapper">
            <Sidebar />
        </div>

        <main class="content-wrapper">
            <RouterView /> 
        </main>
    </div>
</template>