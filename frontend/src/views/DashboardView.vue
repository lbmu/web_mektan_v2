<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useRouter } from 'vue-router';

const router = useRouter();
const items = ref([]); 
const loading = ref(true);

// State Peta & MQTT
let map = null;
let markers = {}; 
let mqttClient = null;
let chartInstance = null;

const MQTT_BROKER = import.meta.env.VITE_MQTT_BROKER;
const MQTT_TOPIC = import.meta.env.VITE_MQTT_TOPIC;

// --- 1. FETCH DATA UTAMA ---
const fetchData = async () => {
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/alsintan`);
    items.value = response.data;
  } catch (error) {
    console.error("Gagal load dashboard:", error);
  } finally {
    loading.value = false;
    await nextTick();
    initGlobalMap();
    initChart(); 
    connectMqtt();
  }
};

// --- 2. LOGIKA STATISTIK (DIBUAT GLOBAL & OTOMATIS) ---
const totalAset = computed(() => items.value.length);
const totalLive = computed(() => items.value.filter(i => i.status_mesin === 'ON').length);

// [BARU] OPSI A: Total Luas Lahan Global (Gabungan Seluruh Alat)
const totalLuasLahanGlobal = computed(() => {
    const totalJarakMeter = items.value.reduce((sum, item) => {
        return sum + (parseFloat(item.total_jarak_kerja) || 0);
    }, 0);
    return (totalJarakMeter / 2500).toFixed(3); 
});

// [PERBAIKAN] Logika Warning List yang lebih rapi
const warningList = computed(() => {
    return items.value.filter(item => {
        const aki = parseFloat(item.tegangan_aki) || 0;
        const isRusak = item.status_operasional === 'Rusak' || item.status_operasional === 'Maintenance';
        // Aki dianggap lemah jika di bawah 11.5V (dan bukan 0 karena sensor mati)
        const isAkiLemah = aki > 0 && aki < 11.5; 
        
        return isRusak || isAkiLemah;
    });
});

// --- 3. KONEKSI MQTT (REAL-TIME UPDATE) ---
const connectMqtt = () => {
  if (!window.mqtt) return;
  mqttClient = window.mqtt.connect(MQTT_BROKER);

  mqttClient.on('connect', () => {
    mqttClient.subscribe(MQTT_TOPIC);
  });

  mqttClient.on('message', (topic, message) => {
    try {
      const data = JSON.parse(message.toString());
      const index = items.value.findIndex(i => i.alsintan_id == data.id_alat);
      
      if (index !== -1) {
        // Update data reaktif (otomatis mengubah angka di kartu atas)
        items.value[index].status_mesin = data.status_mesin;
        items.value[index].latitude = data.lat;
        items.value[index].longitude = data.long;
        
        // Update Marker Peta
        updateMarker(data.id_alat, data.lat, data.long, data.status_mesin);
        
        // Update Chart secara real-time
        initChart(); 
      }
    } catch (err) {}
  });
};

// --- 4. MAPS LEAFLET ---
const initGlobalMap = () => {
    if (map) return;
    map = L.map('global-map').setView([-6.9175, 107.6191], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);

    let group = [];
    items.value.forEach(alat => {
        if (alat.latitude && alat.longitude) {
            createMarker(alat);
            group.push([alat.latitude, alat.longitude]);
        }
    });

    if (group.length > 0) map.fitBounds(group, { padding: [30, 30] });
};

const createMarker = (alat) => {
    const lat = parseFloat(alat.latitude);
    const lng = parseFloat(alat.longitude);
    
    const colorClass = alat.status_mesin === 'ON' ? 'text-success' : 'text-secondary';
    const bgClass = alat.status_mesin === 'ON' ? 'bg-success bg-opacity-10' : 'bg-light';
    const borderClass = alat.status_mesin === 'ON' ? 'border-success' : 'border-secondary';

    const iconHtml = `
      <div class="d-flex justify-content-center align-items-center rounded-circle border border-2 ${borderClass} ${bgClass} shadow-sm" 
           style="width: 32px; height: 32px; background-color: white;">
           <div class="${colorClass}" style="transform: scale(0.9);">
             <i class="bi bi-truck-front-fill" style="font-size: 16px;"></i>
           </div>
      </div>
      ${alat.status_mesin === 'ON' ? '<div class="pulse-ring"></div>' : ''} 
    `;

    const icon = L.divIcon({
        className: 'custom-tractor-icon',
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -20]
    });

    markers[alat.alsintan_id] = L.marker([lat, lng], {icon: icon})
        .addTo(map)
        .bindPopup(`<b>${alat.nama_alat}</b><br>
                    Status: <b class="${colorClass}">${alat.status_mesin}</b><br>
                    Lat: ${lat.toFixed(4)}, Long: ${lng.toFixed(4)}`);
};

const updateMarker = (id, lat, lng, status) => {
    const marker = markers[id];
    if (marker) {
        marker.setLatLng([lat, lng]);
        
        const colorClass = status === 'ON' ? 'text-success' : 'text-secondary';
        const bgClass = status === 'ON' ? 'bg-success bg-opacity-10' : 'bg-light';
        const borderClass = status === 'ON' ? 'border-success' : 'border-secondary';

        const iconHtml = `
            <div class="d-flex justify-content-center align-items-center rounded-circle border border-2 ${borderClass} ${bgClass} shadow-sm" 
                style="width: 32px; height: 32px; background-color: white;">
                <div class="${colorClass}" style="transform: scale(0.9);">
                    <i class="bi bi-truck-front-fill" style="font-size: 16px;"></i>
                </div>
            </div>
            ${status === 'ON' ? '<div class="pulse-ring"></div>' : ''}
        `;

        const newIcon = L.divIcon({
            className: 'custom-tractor-icon',
            html: iconHtml,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });
        marker.setIcon(newIcon);
        
        const popupContent = marker.getPopup().getContent();
        marker.setPopupContent(popupContent.replace(/Status: <b class=".*?">.*?<\/b>/, `Status: <b class="${colorClass}">${status}</b>`));
    }
};

// --- 5. CHART.JS (STATISTIK KONDISI ALAT) ---
const initChart = () => {
    const ctx = document.getElementById('statusChart');
    if (!ctx || typeof Chart === 'undefined') return;
    
    // Hitung Data Terbaru
    const beroperasi = items.value.filter(i => i.status_mesin === 'ON').length;
    const parkir = items.value.filter(i => i.status_mesin === 'OFF' && i.status_operasional.includes('Siap')).length;
    const maintenance = items.value.filter(i => i.status_operasional === 'Maintenance').length;
    const rusak = items.value.filter(i => i.status_operasional === 'Rusak').length;

    const newData = [beroperasi, parkir, maintenance, rusak];

    if (chartInstance) {
        chartInstance.data.datasets[0].data = newData;
        chartInstance.update(); 
    } else {
        chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Sedang Beroperasi', 'Parkir (Siap)', 'Maintenance', 'Rusak'],
                datasets: [{
                    data: newData,
                    backgroundColor: ['#198754', '#6c757d', '#ffc107', '#dc3545'],
                    hoverOffset: 4,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 800 },
                plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } } },
                cutout: '70%'
            }
        });
    }
};

const goToDetail = (id) => router.push({ name: 'monitoring-detail', params: { id } });

onMounted(() => fetchData());
onUnmounted(() => { if(mqttClient) mqttClient.end(); });
</script>

<template>
  <div class="container-fluid pb-5">
    
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h3 class="fw-bold text-dark mb-0">📡 Dashboard Utama</h3>
        <p class="text-muted small">Pusat informasi dan kontrol monitoring real-time Balai Mektan.</p>
      </div>
    </div>

    <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary"></div>
    </div>

    <div v-else>
        <div class="row g-3 mb-4">
            
            <div class="col-md-3">
                <div class="card border-0 shadow-sm bg-primary text-white h-100">
                    <div class="card-body">
                        <h6 class="text-white-50">Total Armada</h6>
                        <h2 class="fw-bold mb-0">{{ totalAset }} <small class="fs-6">Unit</small></h2>
                    </div>
                </div>
            </div>
            
            <div class="col-md-3">
                <div class="card border-0 shadow-sm bg-success text-white h-100 overflow-hidden position-relative">
                    <div class="position-absolute top-0 end-0 p-3 opacity-25">
                        <i class="bi bi-broadcast fs-1"></i>
                    </div>

                    <div class="card-body position-relative z-1">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-white-50">Sedang Aktif</h6>
                                <h2 class="fw-bold mb-0">{{ totalLive }} <small class="fs-6">Unit</small></h2>
                            </div>
                            
                            <div v-if="totalLive > 0" class="radar-container">
                                <div class="radar-ring"></div>
                                <div class="radar-ring delay-1"></div>
                                <!-- <i class="bi bi-activity position-relative z-2 fs-3"></i> -->
                            </div>
                            <div v-else class="opacity-50">
                                <!-- <i class="bi bi-power fs-2 opacity-50"></i> -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-md-3">
                <div class="card border-0 shadow-sm bg-info text-white h-100 position-relative overflow-hidden">
                    <div class="position-absolute bottom-0 end-0 p-2 opacity-25" style="transform: rotate(-15deg) scale(1.5);">
                        
                    </div>
                    <div class="card-body position-relative z-1">
                        <h6 class="text-white-50 mb-2 text-uppercase fw-bold" style="font-size: 11px;">Total Cakupan Lahan</h6>
                        <h2 class="fw-bold mb-0">{{ totalLuasLahanGlobal }} <small class="fs-6">Ha</small></h2>
                    </div>
                </div>
            </div>

            <div class="col-md-3">
                <div class="card border-0 shadow-sm h-100" :class="warningList.length > 0 ? 'bg-danger text-white' : 'bg-danger text-white'">
                    <div class="card-body">
                        <h6 :class="warningList.length > 0 ? 'text-white-50' : 'text-muted'">Perlu Perhatian</h6>
                        <h2 class="fw-bold mb-0">{{ warningList.length }} <small class="fs-6">Isu</small></h2>
                        <small v-if="warningList.length > 0" class="d-block mt-1 text-white-50" style="font-size: 10px;">
                            *Aki lemah (< 11.5V) atau unit rusak
                        </small>
                    </div>
                </div>
            </div>
        </div>

        <div class="row g-3 mb-4">
            <div class="col-lg-8">
                <div class="card border-0 shadow-sm h-100">
                    <div class="card-header bg-white fw-bold py-3 d-flex justify-content-between align-items-center">
                        <span><i class="bi bi-map me-2"></i> Sebaran Armada Keseluruhan</span>
                        <span class="badge bg-success" v-if="totalLive > 0"><i class="bi bi-broadcast"></i> Live Mode Active</span>
                    </div>
                    <div class="card-body p-0">
                        <div id="global-map" style="height: 450px; width: 100%; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px;"></div>
                    </div>
                </div>
            </div>

            <div class="col-lg-4">
                <div class="d-flex flex-column gap-3 h-100">
                    
                    <div class="card border-0 shadow-sm flex-fill">
                        <div class="card-header bg-white fw-bold py-3"><i class="bi bi-pie-chart-fill me-2 text-primary"></i> Rasio Kondisi Fisik</div>
                        <div class="card-body">
                            <div style="height: 220px; position: relative;">
                                <canvas id="statusChart"></canvas>
                                <div class="position-absolute start-50 translate-middle text-center" style="top: 35%; pointer-events: none;">
                                    <div class="fw-bolder" style="font-size: 3rem; color: #1e293b; line-height: 1;">{{ totalAset }}</div>
                                    <div class="text-uppercase fw-bold" style="font-size: 0.7rem; color: #94a3b8; letter-spacing: 2px; margin-top: 2px;">Unit</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card border-0 shadow-sm flex-fill">
                        <div class="card-header bg-danger text-white fw-bold py-2 small d-flex justify-content-between align-items-center">
                            <span><i class="bi bi-exclamation-triangle-fill me-1"></i> Log Peringatan</span>
                            <span class="badge bg-white text-danger">{{ warningList.length }}</span>
                        </div>
                        <div class="card-body p-0 overflow-auto custom-scrollbar" style="max-height: 160px;">
                            <ul class="list-group list-group-flush">
                                <li v-for="w in warningList" :key="w.alsintan_id" 
                                    class="list-group-item d-flex justify-content-between align-items-center list-group-item-action"
                                    @click="goToDetail(w.alsintan_id)" style="cursor: pointer;">
                                    <div>
                                        <div class="fw-bold text-danger" style="font-size: 13px;">{{ w.nama_alat }}</div>
                                        <small class="text-muted" style="font-size:11px;">
                                            Aki: <span :class="w.tegangan_aki < 11.5 ? 'text-danger fw-bold' : ''">{{ w.tegangan_aki }}V</span> | 
                                            <span :class="w.status_operasional === 'Rusak' ? 'text-danger fw-bold' : ''">{{ w.status_operasional }}</span>
                                        </small>
                                    </div>
                                    <i class="bi bi-chevron-right text-muted small"></i>
                                </li>
                                <li v-if="warningList.length === 0" class="list-group-item text-center text-muted py-4 border-0">
                                    <i class="bi bi-check-circle text-success fs-3 d-block mb-1"></i>
                                    <small>Semua sistem & perangkat aman</small>
                                </li>
                            </ul>
                        </div>
                    </div>

                </div>
            </div>
        </div>

    </div>
  </div>
</template>

<style scoped>
/* CSS UNTUK MAP ICON */
.custom-tractor-icon { background: transparent; border: none; }
.pulse-ring {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 32px; height: 32px;
    border-radius: 50%;
    border: 2px solid #198754;
    animation: mapPulse 1.5s infinite;
    z-index: -1;
}
@keyframes mapPulse {
    0% { width: 32px; height: 32px; opacity: 1; }
    100% { width: 60px; height: 60px; opacity: 0; }
}

/* CSS UNTUK RADAR ANIMASI KARTU AKTIF */
.radar-container { position: relative; width: 40px; height: 40px; display: flex; justify-content: center; align-items: center; }
.radar-ring { position: absolute; width: 100%; height: 100%; border-radius: 50%; border: 2px solid rgba(255, 255, 255, 0.6); animation: radarExpand 2s infinite ease-out; }
.radar-ring.delay-1 { animation-delay: 0.6s; }
@keyframes radarExpand { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(1.5); opacity: 0; } }

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #dee2e6; border-radius: 4px; }
</style>