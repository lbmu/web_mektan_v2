<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useRouter } from 'vue-router';
import mqtt from 'mqtt';

const router = useRouter();

// --- STATE APLIKASI ---
const loading = ref(true);
const alsintanList = ref([]);

// State Panel Kiri
const searchQuery = ref('');
const filterStatus = ref('ALL');

// State Peta & MQTT
let map = null;
let markers = {};
let mqttClient = null;
const MQTT_HOST = import.meta.env.VITE_MQTT_HOST;
const MQTT_PORT = Number(import.meta.env.VITE_MQTT_PORT);
const MQTT_TOPIC = import.meta.env.VITE_MQTT_TOPIC;
const MQTT_USERNAME = import.meta.env.VITE_MQTT_USERNAME;
const MQTT_PASSWORD = import.meta.env.VITE_MQTT_PASSWORD;

// --- COMPUTED PROPERTIES ---
const filteredAlsintan = computed(() => {
    return alsintanList.value.filter(item => {
        const matchSearch = item.nama_alat.toLowerCase().includes(searchQuery.value.toLowerCase()) || 
                            item.kode_perangkat.toLowerCase().includes(searchQuery.value.toLowerCase());
        const matchStatus = filterStatus.value === 'ALL' || item.status_mesin === filterStatus.value;
        return matchSearch && matchStatus;
    });
});

// --- 1. FETCH DATA UTAMA ---
const fetchAllData = async () => {
    try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/alsintan`);
        alsintanList.value = response.data;
        
        await nextTick();
        if (!map) initMap();
        renderGlobalMarkers();
    } catch (error) {
        console.error("Gagal load data:", error);
    } finally {
        loading.value = false;
    }
};

// --- 2. LOGIKA PETA (LEAFLET) ---
const initMap = () => {
    map = L.map('main-map', { zoomControl: false }).setView([-6.9175, 107.6191], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
};

const createIcon = (status) => {
    const isON = status === 'ON';
    const color = isON ? 'text-success' : 'text-secondary';
    const border = isON ? 'border-success' : 'border-secondary';
    const bg = isON ? 'bg-success bg-opacity-10' : 'bg-light';
    
    return L.divIcon({
        className: 'custom-tractor-icon',
        html: `
            <div class="d-flex justify-content-center align-items-center rounded-circle border border-2 ${border} ${bg} shadow-sm position-relative" 
                 style="width: 36px; height: 36px; background-color: white;">
                 <i class="bi bi-truck-front-fill ${color}" style="font-size: 18px;"></i>
                 ${isON ? '<div class="pulse-ring"></div>' : ''}
            </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20]
    });
};

const renderGlobalMarkers = () => {
    // Hapus marker lama
    Object.values(markers).forEach(m => map.removeLayer(m));
    markers = {};

    let group = [];
    filteredAlsintan.value.forEach(alat => {
        if (alat.latitude && alat.longitude) {
            const latLng = [parseFloat(alat.latitude), parseFloat(alat.longitude)];
            const marker = L.marker(latLng, { icon: createIcon(alat.status_mesin) }).addTo(map);
            
            marker.bindTooltip(`<b>${alat.kode_perangkat}</b>`, { direction: 'top', offset: [0, -15] });
            
            // JIKA MARKER DI PETA DIKLIK -> LEMPAR KE HALAMAN DETAIL
            marker.on('click', () => goToDetail(alat.alsintan_id)); 
            
            markers[alat.alsintan_id] = marker;
            group.push(latLng);
        }
    });

    if (group.length > 0) {
        map.fitBounds(group, { padding: [50, 50] });
    }
};

// --- 3. NAVIGASI KE HALAMAN DETAIL YANG SUDAH ADA ---
const goToDetail = (id) => {
    router.push({ name: 'monitoring-detail', params: { id } });
};

// --- 4. MQTT REAL-TIME ---
const connectMqtt = () => {
    // Buat konfigurasi opsi untuk koneksi Private Cluster
    const options = {
        host: MQTT_HOST,
        port: MQTT_PORT,
        protocol: 'wss', // Kunci keamanan: WebSockets Secure
        path: '/mqtt',   // Path wajib untuk HiveMQ Cloud di browser
        username: MQTT_USERNAME,
        password: MQTT_PASSWORD
    };

    // Gunakan fungsi mqtt yang di-import, bukan window.mqtt
    mqttClient = mqtt.connect(options);

    mqttClient.on('connect', () => {
        console.log('✅ Peta Live terhubung ke HiveMQ Private Cluster!');
        mqttClient.subscribe(MQTT_TOPIC);
    });

    mqttClient.on('error', (err) => {
        console.error('❌ Gagal terhubung ke MQTT:', err);
    });

    mqttClient.on('message', (topic, message) => {
        try {
            const data = JSON.parse(message.toString());
            
            // KUNCI UTAMA: Samakan pencariannya dengan Dashboard (menggunakan id_alat)
            const index = alsintanList.value.findIndex(i => i.alsintan_id == data.id_alat);
            
            if (index !== -1) {
                // 1. Update data reaktif (List di sebelah kiri akan otomatis berubah)
                alsintanList.value[index].status_mesin = data.status_mesin;
                
                // Pastikan koordinat bukan 0,0 (Anti-Teleportasi)
                const isGpsValid = data.lat !== 0 && data.long !== 0;
                if (isGpsValid) {
                    alsintanList.value[index].latitude = data.lat;
                    alsintanList.value[index].longitude = data.long;
                }

                // 2. Update Marker Peta Leaflet
                const currentId = alsintanList.value[index].alsintan_id;
                const marker = markers[currentId];
                
                if (marker) {
                    // Update warna icon
                    marker.setIcon(createIcon(data.status_mesin));
                    // Update posisi koordinat
                    if (isGpsValid) marker.setLatLng([data.lat, data.long]);
                }
            }
        } catch (err) {
            console.error('Format JSON dari MQTT salah:', err);
        }
    });
};


// Jika filter atau search diubah, gambar ulang markernya
watch([searchQuery, filterStatus], () => {
    renderGlobalMarkers();
});

onMounted(() => {
    fetchAllData();
    connectMqtt();
});

onUnmounted(() => {
    if (mqttClient) mqttClient.end();
    if (map) map.remove();
});
</script>

<template>
  <div class="row g-0 bg-light" style="height: calc(100vh - 4rem); border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
    
    <div class="col-md-4 col-lg-3 bg-white d-flex flex-column border-end position-relative" style="height: 100%;">
        
        <div class="p-3 border-bottom bg-light">
            <h5 class="fw-bold mb-0 text-primary">
                <i class="bi bi-geo-alt-fill me-1"></i> Lokasi Traktor
            </h5>
        </div>

        <div class="d-flex flex-column h-100">
            <div class="p-3 border-bottom">
                <input v-model="searchQuery" type="text" class="form-control mb-2 bg-light border-0" placeholder="🔍 Cari nama / kode alat...">
                <div class="btn-group w-100 shadow-sm" role="group">
                    <input type="radio" class="btn-check" name="btnradio" id="btnAll" value="ALL" v-model="filterStatus">
                    <label class="btn btn-outline-primary btn-sm" for="btnAll">Semua</label>

                    <input type="radio" class="btn-check" name="btnradio" id="btnOn" value="ON" v-model="filterStatus">
                    <label class="btn btn-outline-success btn-sm" for="btnOn">Live (ON)</label>

                    <input type="radio" class="btn-check" name="btnradio" id="btnOff" value="OFF" v-model="filterStatus">
                    <label class="btn btn-outline-secondary btn-sm" for="btnOff">Offline</label>
                </div>
            </div>

            <div class="overflow-auto flex-grow-1 p-2 custom-scrollbar">
                <div v-if="loading" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm"></div> Memuat...</div>
                
                <div v-else-if="filteredAlsintan.length === 0" class="text-center py-4 text-muted small">
                    Tidak ada armada yang sesuai filter.
                </div>

                <div v-for="alat in filteredAlsintan" :key="alat.alsintan_id" 
                     @click="goToDetail(alat.alsintan_id)"
                     class="card border-0 shadow-sm mb-2 cursor-pointer alat-card">
                    <div class="card-body p-3 d-flex align-items-center">
                        <div class="me-3 position-relative">
                            <div class="rounded-circle d-flex align-items-center justify-content-center bg-light" style="width: 40px; height: 40px;">
                                <i class="bi bi-truck-front fs-5 text-secondary"></i>
                            </div>
                            <span class="position-absolute bottom-0 end-0 p-1 border border-white rounded-circle"
                                  :class="alat.status_mesin === 'ON' ? 'bg-success' : 'bg-secondary'"
                                  style="width: 12px; height: 12px;"></span>
                        </div>
                        <div class="flex-grow-1">
                            <h6 class="mb-0 fw-bold">{{ alat.kode_perangkat }}</h6>
                            <small class="text-muted" style="font-size: 11px;">{{ alat.nama_alat }}</small>
                        </div>
                        <i class="bi bi-chevron-right text-muted opacity-50"></i>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="col-md-8 col-lg-9 position-relative bg-dark h-100">
        <div id="main-map" style="height: 100%; width: 100%;"></div>
    </div>

  </div>
</template>

<style scoped>
.cursor-pointer { cursor: pointer; }
.alat-card { transition: all 0.2s; border: 1px solid transparent !important; }
.alat-card:hover { border-color: #0d6efd !important; background-color: #f8f9fa; transform: translateX(5px); }

.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #dee2e6; border-radius: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #adb5bd; }

.custom-tractor-icon { background: transparent; border: none; }
.pulse-ring {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 36px; height: 36px;
    border-radius: 50%;
    border: 2px solid #198754;
    animation: mapPulse 1.5s infinite;
    z-index: -1;
}
@keyframes mapPulse {
    0% { width: 36px; height: 36px; opacity: 1; }
    100% { width: 70px; height: 70px; opacity: 0; }
}
</style>