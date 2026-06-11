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
const app = createApp(App)

app.use(router)

app.mount('#app')