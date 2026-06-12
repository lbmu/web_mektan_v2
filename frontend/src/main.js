import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import axios from 'axios'

//Import Bootstrap 
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

//Import Leaflet
import 'leaflet/dist/leaflet.css' 

//Import CSS
import './assets/main.css'

axios.interceptors.request.use(
    (config) => {
        // Ambil token dari brankas sessionStorage
        const token = sessionStorage.getItem('token');
        
        // Jika token ada, tempelkan di Header HTTP dengan format "Bearer <token>"
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

axios.interceptors.response.use(
    (response) => {
        // Jika respons sukses, teruskan saja datanya
        return response;
    },
    (error) => {
        // Jika backend menolak karena Token salah / kadaluwarsa / login di perangkat lain
        if (error.response && error.response.status === 401) {
            
            // 1. Kosongkan brankas sesi
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('token');
            
            // 2. Munculkan peringatan ke layar
            Swal.fire({
                icon: 'warning',
                title: 'Sesi Berakhir!',
                text: 'Akun Anda telah masuk di perangkat lain atau sesi telah kedaluwarsa. Silakan login kembali.',
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'Login Ulang',
                allowOutsideClick: false // Paksa user menekan tombol
            }).then(() => {
                // 3. Lempar paksa ke halaman login
                router.push({ name: 'login' });
            });
        }
        return Promise.reject(error);
    }
);

const app = createApp(App)

app.use(router)

app.mount('#app')