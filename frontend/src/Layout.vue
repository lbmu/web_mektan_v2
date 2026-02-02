<script setup>
import { ref } from 'vue';
import Sidebar from './components/Sidebar.vue';
import { RouterView } from 'vue-router';

const isCollapsed = ref(false);
const toggleSidebar = () => {
    isCollapsed.value = !isCollapsed.value;
};

</script>

<template>
    <div class="app-container">
        <div class="sidebar-wrapper" :class="{ 'collapsed': isCollapsed }">
            <Sidebar 
                :isCollapsed="isCollapsed"
                @toggle-sidebar="toggleSidebar"
            />
        </div>

        <main class="content-wrapper" :class="{ 'collapsed': isCollapsed }">
            <RouterView /> 
        </main>
        
    </div>
</template>