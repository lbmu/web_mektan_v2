<script setup>
import { useRoute } from 'vue-router';
import Layout from './Layout.vue';

const route = useRoute();
</script>

<template>
    <div v-if="route.meta.isPublicLayout" class="w-100">
        <RouterView />
    </div>
    
    <Layout v-else />
</template>