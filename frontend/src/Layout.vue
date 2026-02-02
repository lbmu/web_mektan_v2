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