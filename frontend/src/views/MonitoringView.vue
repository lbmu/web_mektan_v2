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
let offlineTimers = {}; // KAMUS TIMER: Menyimpan stopwatch untuk setiap traktor
const TIMEOUT_BATAS_MS = 600000; // 10 Menit

const MQTT_HOST = import.meta.env.VITE_MQTT_HOST;
const MQTT_PORT = Number(import.meta.env.VITE_MQTT_PORT);
const MQTT_TOPIC = import.meta.env.VITE_MQTT_TOPIC;
const MQTT_USERNAME = import.meta.env.VITE_MQTT_USERNAME;
const MQTT_PASSWORD = import.meta.env.VITE_MQTT_PASSWORD;

// --- COMPUTED PROPERTIES (FILTER) ---
const filteredAlsintan = computed(() => {
    return alsintanList.value.filter(item => {
        const matchSearch = item.nama_alat.toLowerCase().includes(searchQuery.value.toLowerCase()) || 
                            item.kode_perangkat.toLowerCase().includes(searchQuery.value.toLowerCase());
        
        // Logika Filter Ganda (IoT & Mesin)
        let matchStatus = false;
        if (filterStatus.value === 'ALL') matchStatus = true;
        else if (filterStatus.value === 'ON') matchStatus = item.status_iot === 'ON' && item.status_mesin === 'ON';
        else if (filterStatus.value === 'OFF') matchStatus = item.status_iot === 'ON' && item.status_mesin === 'OFF';
        else if (filterStatus.value === 'OFFLINE') matchStatus = item.status_iot !== 'ON'; // Termasuk UNKNOWN

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

// HELPER FUNGSI: Pembuat Ikon Peta Dinamis
const createIcon = (status_mesin, status_iot) => {
    let border = 'border-danger';
    let bg = 'bg-danger bg-opacity-10';
    let isON = false;

    // Logika Pewarnaan Ganda
    if (status_iot === 'ON') {
        if (status_mesin === 'ON') {
            border = 'border-success'; bg = 'bg-success bg-opacity-10'; isON = true;
        } else if (status_mesin === 'OFF') {
            border = 'border-dark'; bg = 'bg-dark bg-opacity-10'; // Parkir
        }
    } else {
        // Jika status_iot mati/UNKNOWN
        border = 'border-danger'; bg = 'bg-danger bg-opacity-10'; 
    }
    
    return L.divIcon({
        className: 'custom-tractor-icon',
        html: `
            <div class="d-flex justify-content-center align-items-center rounded-circle border border-2 ${border} ${bg} shadow-sm position-relative" 
                style="width: 36px; height: 36px; background-color: white;">
                <img src="/ikon-traktor.png" style="width: 22px; height: 22px; object-fit: contain;">
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
            const marker = L.marker(latLng, { icon: createIcon(alat.status_mesin, alat.status_iot) }).addTo(map);
            
            // Tooltip dengan info status
            const statusTeks = alat.status_iot === 'ON' ? alat.status_mesin : 'OFFLINE';
            marker.bindTooltip(`<b>${alat.kode_perangkat}</b><br><small>${statusTeks}</small>`, { direction: 'top', offset: [0, -15] });
            
            marker.on('click', () => goToDetail(alat.alsintan_id)); 
            
            markers[alat.alsintan_id] = marker;
            group.push(latLng);
        }
    });

    if (group.length > 0) {
        map.fitBounds(group, { padding: [50, 50] });
    }
};

// HELPER FUNGSI: Penentu Warna Titik di Sidebar
const getDotClass = (iot, mesin) => {
    if (iot !== 'ON') return 'bg-danger'; // Hilang Sinyal
    if (mesin === 'ON') return 'bg-success'; // Bekerja
    return 'bg-dark'; // Parkir
};

// --- 3. NAVIGASI KE HALAMAN DETAIL YANG SUDAH ADA ---
const goToDetail = (id) => {
    router.push({ name: 'monitoring-detail', params: { id } });
};

// --- 4. MQTT REAL-TIME ---
const connectMqtt = () => {
    const options = {
        host: MQTT_HOST,
        port: MQTT_PORT,
        protocol: 'wss',
        path: '/mqtt',
        username: MQTT_USERNAME,
        password: MQTT_PASSWORD
    };

    mqttClient = mqtt.connect(options);

    mqttClient.on('connect', () => {
        console.log('✅ Peta Live terhubung (Watchdog Multi-Tractor Aktif)!');
        mqttClient.subscribe(MQTT_TOPIC);
    });

    mqttClient.on('error', (err) => {
        console.error('❌ Gagal terhubung ke MQTT:', err);
    });

    mqttClient.on('message', (topic, message) => {
        try {
            const data = JSON.parse(message.toString());
            const index = alsintanList.value.findIndex(i => i.alsintan_id == data.id);
            
            if (index !== -1) {
                // ==========================================
                // 🛡️ FRONTEND WATCHDOG (PER TRAKTOR)
                // ==========================================
                // Bersihkan timer lama untuk traktor spesifik ini
                if (offlineTimers[data.id]) clearTimeout(offlineTimers[data.id]);
                
                // Buat timer 10 menit baru untuk traktor ini
                offlineTimers[data.id] = setTimeout(() => {
                    const idx = alsintanList.value.findIndex(i => i.alsintan_id == data.id);
                    if (idx !== -1) {
                        console.warn(`⚠️ Traktor ${data.id} kehilangan sinyal (>10 menit)!`);
                        alsintanList.value[idx].status_iot = 'OFF';
                        alsintanList.value[idx].status_mesin = 'UNKNOWN';
                        
                        // Ubah ikon peta jadi Merah (Offline)
                        const marker = markers[data.id];
                        if (marker) marker.setIcon(createIcon('UNKNOWN', 'OFF'));
                    }
                }, TIMEOUT_BATAS_MS);
                // ==========================================

                // PARSING LOGIKA TEGANGAN >= 13.0V
                const tegangan = parseFloat(data.V) || 0;
                const statusMesinBaru = tegangan >= 13.0 ? 'ON' : 'OFF';

                const lat = parseFloat(data.lat);
                const long = parseFloat(data.long || data.lng);
                const isGpsValid = lat && long && !isNaN(lat) && !isNaN(long) && lat !== 0 && long !== 0;

                // UPDATE DATA REAKTIF
                alsintanList.value[index].status_iot = 'ON';
                alsintanList.value[index].status_mesin = statusMesinBaru;
                
                if (isGpsValid) {
                    alsintanList.value[index].latitude = lat;
                    alsintanList.value[index].longitude = long;
                }

                // UPDATE MARKER PETA LEAFLET
                const currentId = alsintanList.value[index].alsintan_id;
                const marker = markers[currentId];
                
                if (marker) {
                    marker.setIcon(createIcon(statusMesinBaru, 'ON'));
                    marker.setTooltipContent(`<b>${alsintanList.value[index].kode_perangkat}</b><br><small>${statusMesinBaru}</small>`);
                    if (isGpsValid) {
                        marker.setLatLng([lat, long]);
                    }
                }
            }
        } catch (err) {}
    });
};

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
    // Bersihkan semua watchdog timer saat pindah halaman agar tidak bocor memori
    Object.values(offlineTimers).forEach(timer => clearTimeout(timer));
});
</script>

<template>
  <div class="container-fluid d-flex flex-column pb-1" style="height: calc(100vh - 4.5rem);">
    
    <div class="row g-0 bg-light flex-grow-1" style="border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
        
        <div class="col-md-5 col-lg-4 bg-white d-flex flex-column border-end position-relative" style="height: 100%;">
            
            <div class="p-3 border-bottom bg-light flex-shrink-0">
                <h5 class="fw-bold mb-0 text-primary">
                    <i class="bi bi-geo-alt-fill me-1"></i> Lokasi Alsintan
                </h5>
            </div>

            <div class="d-flex flex-column h-100 overflow-hidden">
                <div class="p-3 border-bottom flex-shrink-0">
                    <input v-model="searchQuery" type="text" class="form-control mb-2 bg-light border-0" placeholder="🔍 Cari nama / kode alat...">
                    
                    <div class="d-flex w-100 gap-2">
                        <input type="radio" class="btn-check" name="btnradio" id="btnAll" value="ALL" v-model="filterStatus">
                        <label class="btn btn-outline-primary btn-sm rounded-pill flex-fill shadow-sm fw-bold px-0" for="btnAll" style="font-size: 11px; padding-block: 6px;">Semua</label>

                        <input type="radio" class="btn-check" name="btnradio" id="btnOn" value="ON" v-model="filterStatus">
                        <label class="btn btn-outline-success btn-sm rounded-pill flex-fill shadow-sm fw-bold px-0" for="btnOn" style="font-size: 11px; padding-block: 6px;">Kerja</label>

                        <input type="radio" class="btn-check" name="btnradio" id="btnOff" value="OFF" v-model="filterStatus">
                        <label class="btn btn-outline-dark btn-sm rounded-pill flex-fill shadow-sm fw-bold px-0" for="btnOff" style="font-size: 11px; padding-block: 6px;">Parkir</label>

                        <input type="radio" class="btn-check" name="btnradio" id="btnOffline" value="OFFLINE" v-model="filterStatus">
                        <label class="btn btn-outline-danger btn-sm rounded-pill flex-fill shadow-sm fw-bold px-0" for="btnOffline" style="font-size: 11px; padding-block: 6px;">Offline</label>
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
                                    :class="getDotClass(alat.status_iot, alat.status_mesin)"
                                    style="width: 14px; height: 14px;"></span>
                            </div>
                            <div class="flex-grow-1">
                                <h6 class="mb-0 fw-bold">{{ alat.kode_perangkat }}</h6>
                                <small class="text-muted" style="font-size: 11px;">
                                    {{ alat.nama_alat }} <br>
                                    <span v-if="alat.status_iot !== 'ON'" class="text-danger"><i class="bi bi-wifi-off"></i> Offline / Sinyal Hilang</span>
                                    <span v-else-if="alat.status_mesin === 'OFF'" class="text-dark"><i class="bi bi-pause-circle"></i> Mesin Parkir</span>
                                </small>
                            </div>
                            <i class="bi bi-chevron-right text-muted opacity-50"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-md-7 col-lg-8 d-flex flex-column bg-dark p-0" style="height: 100%;">
            <div id="main-map" class="flex-grow-1 w-100"></div>
        </div>
    </div>

    <div class="text-center mt-2 flex-shrink-0 text-muted" style="font-size: 0.75rem; letter-spacing: 0.5px;">
        &copy; 2026 Balai Pengembangan Mekanisasi Pertanian - Pemprov Jawa Barat. Versi 1.1.0
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