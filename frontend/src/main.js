import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

//Import Bootstrap 
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

//Import Leaflet
import 'leaflet/dist/leaflet.css' 

//Import CSS
import './assets/main.css'

const app = createApp(App)

app.use(router)

app.mount('#app')