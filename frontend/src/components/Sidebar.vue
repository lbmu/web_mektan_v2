<script setup>
import { RouterLink } from 'vue-router';
</script>

<template>
    <div class="d-flex flex-column flex-shrink-0 p-3 h-100">
    
        <a href="/" class="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-white text-decoration-none">
            <span class="fs-4 fw-bold">🚜 Si-Alsintan</span>
        </a>
    
        <hr class="text-white-50"> <ul class="nav nav-pills flex-column mb-auto">
            <li class="nav-item">
                <RouterLink to="/" class="nav-link" active-class="active">
                    📊 Dashboard
                </RouterLink>
            </li>
            <li>
                <RouterLink to="/aset" class="nav-link" active-class="active">
                    🛠️ Manajemen Aset
                </RouterLink>
            </li>
            <li>
                <RouterLink to="/monitoring" class="nav-link" active-class="active">
                    🌍 Monitoring Peta
                </RouterLink>
            </li>
            <li>
                <RouterLink to="/estimasi" class="nav-link" active-class="active">
                    🧮 Estimasi Lahan
                </RouterLink>
            </li>
        </ul>
    
        <hr class="text-white-50">
    
        <div class="dropdown">
            <a href="#" class="d-flex align-items-center text-white text-decoration-none dropdown-toggle" id="dropdownUser1" data-bs-toggle="dropdown" aria-expanded="false">
                <img src="https://github.com/mdo.png" alt="" width="32" height="32" class="rounded-circle me-2">
                <strong>Halo, Admin</strong>
            </a>
            <ul class="dropdown-menu dropdown-menu-dark text-small shadow" aria-labelledby="dropdownUser1">
                <li><a class="dropdown-item" href="#">Settings</a></li>
                <li><a class="dropdown-item" href="#">Profile</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item" href="#">Sign out</a></li>
            </ul>
        </div>
    </div>
</template>