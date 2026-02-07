<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useRouter } from 'vue-router';

const router = useRouter();
const items = ref([]); 
const loading = ref(true);
const selectedId = ref('');

// State Peta & MQTT
let map = null;
let markers = {}; 
let mqttClient = null;
let chartInstance = null;

const MQTT_BROKER = 'ws://broker.hivemq.com:8000/mqtt';
const MQTT_TOPIC = 'project-mektan/v1/data';

// [BARU] Icon Traktor (SVG Path) agar tidak perlu download gambar
const tractorSVG = `
<svg viewBox="0 0 640 512" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
  <path d="M624 208h-64v-64c0-8.8-7.2-16-16-16h-32c-8.8 0-16 7.2-16 16v64h-32c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h32v32c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16v-32h64c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16zm-400 48c70.7 0 128-57.3 128-128S294.7 0 224 0 96 57.3 96 128s57.3 128 128 128zm89.6 32h-16.7c-22.2 10.2-46.9 16-72.9 16s-50.6-5.8-72.9-16h-16.7C60.2 288 0 348.2 0 422.4V464c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48v-41.6c0-74.2-60.2-134.4-134.4-134.4z" fill="currentColor"/>
</svg>`;

// --- 1. FETCH DATA ---
const fetchData = async () => {
  try {
    const response = await axios.get('http://localhost:3000/api/alsintan');
    items.value = response.data;

    if (items.value.length > 0) {
      selectedId.value = items.value[0].alsintan_id;
    }

  } catch (error) {
    console.error("Gagal load dashboard:", error);
  } finally {
    loading.value = false;
    await nextTick();
    initGlobalMap();
    initChart(); // Chart akan otomatis menghitung status "Sedang Beroperasi"
    connectMqtt();
  }
};

// --- 2. MQTT KONEKSI ---
const connectMqtt = () => {
  if (!window.mqtt) return;
  mqttClient = window.mqtt.connect(MQTT_BROKER);

  mqttClient.on('connect', () => {
    console.log("Dashboard Live Connected!");
    mqttClient.subscribe(MQTT_TOPIC);
  });

  mqttClient.on('message', (topic, message) => {
    try {
      const data = JSON.parse(message.toString());
      
      const index = items.value.findIndex(i => i.alsintan_id == data.id_alat);
      if (index !== -1) {
        items.value[index].status_mesin = data.status_mesin;
        items.value[index].latitude = data.lat;
        items.value[index].longitude = data.long;
        
        // Update Marker Peta
        updateMarker(data.id_alat, data.lat, data.long, data.status_mesin);
        
        // [BARU] Update Chart secara real-time saat status mesin berubah
        initChart(); 
      }
    } catch (err) {
      console.error("MQTT Error", err);
    }
  });
};

// --- 3. LOGIK STATISTIK ---
const totalAset = computed(() => items.value.length);
const totalLive = computed(() => items.value.filter(i => i.status_mesin === 'ON').length);

const luasTerpilih = computed(() => {
    if (!selectedId.value) return 0;
    const alat = items.value.find(i => i.alsintan_id == selectedId.value);
    if (!alat) return 0;
    const m = parseFloat(alat.total_jarak_kerja) || 0;
    return (m / 2500).toFixed(3); 
});

const warningList = computed(() => {
    return items.value.filter(item => {
        const aki = parseFloat(item.tegangan_aki) || 0;
        return aki < 12.0 || (item.status_operasional !== 'Siap Digunakan' && item.status_operasional !== 'Siap Operasi');
    });
});

// --- 4. MAPS DENGAN ICON TRAKTOR ---
const initGlobalMap = () => {
    if (map) return;
    map = L.map('global-map').setView([-6.9175, 107.6191], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);

    items.value.forEach(alat => {
        if (alat.latitude && alat.longitude) {
            createMarker(alat);
        }
    });
};

// [BARU] Fungsi Membuat Marker Traktor
const createMarker = (alat) => {
    const lat = parseFloat(alat.latitude);
    const lng = parseFloat(alat.longitude);
    
    // Tentukan Warna: Hijau jika ON, Abu jika OFF
    const colorClass = alat.status_mesin === 'ON' ? 'text-success' : 'text-secondary';
    const bgClass = alat.status_mesin === 'ON' ? 'bg-success bg-opacity-10' : 'bg-light';
    const borderClass = alat.status_mesin === 'ON' ? 'border-success' : 'border-secondary';

    // HTML Icon Custom (Traktor)
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
        
        // Update Warna Icon saat status berubah
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
        
        // Update popup agar teks statusnya juga berubah
        const popupContent = marker.getPopup().getContent();
        // Simple replace untuk update status text di popup (opsional, bisa rebuild string)
        marker.setPopupContent(popupContent.replace(/Status: <b class=".*?">.*?<\/b>/, `Status: <b class="${colorClass}">${status}</b>`));
    }
};

// --- 5. CHART DENGAN KATEGORI BARU ---
const initChart = () => {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;
    
    // Hitung Data Terbaru
    const beroperasi = items.value.filter(i => i.status_mesin === 'ON').length;
    const parkir = items.value.filter(i => 
        i.status_mesin === 'OFF' && i.status_operasional.includes('Siap')
    ).length;
    const maintenance = items.value.filter(i => i.status_operasional === 'Maintenance').length;
    const rusak = items.value.filter(i => i.status_operasional === 'Rusak').length;

    // Data array untuk grafik
    const newData = [beroperasi, parkir, maintenance, rusak];

    // [PERBAIKAN UTAMA DISINI]
    if (chartInstance) {
        // Jika grafik sudah ada, Update isinya saja (Jangan di-destroy!)
        chartInstance.data.datasets[0].data = newData;
        chartInstance.update(); // Chart.js akan melakukan animasi transisi halus
    } else {
        // Jika grafik belum ada (pertama kali load), baru buat instance
        chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Sedang Beroperasi', 'Parkir (Siap)', 'Maintenance', 'Rusak'],
                datasets: [{
                    data: newData,
                    backgroundColor: ['#198754', '#6c757d', '#ffc107', '#dc3545'],
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                animation: {
                    duration: 500 // Durasi animasi update (ms)
                },
                plugins: { legend: { position: 'bottom', labels: { usePointStyle: true } } }
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
        <h3 class="fw-bold text-dark mb-0">📡 Dashboard Live</h3>
        <p class="text-muted small">Pusat kontrol monitoring real-time.</p>
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
                                <i class="bi bi-truck-front-fill position-relative z-2 fs-4"></i>
                            </div>
                            <div v-else class="opacity-50">
                                <i class="bi bi-pause-circle fs-2"></i>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            <div class="col-md-3">
                <div class="card border-0 shadow-sm bg-info text-white h-100">
                    <div class="card-body">
                        <h6 class="text-white-50 mb-2">Cakupan Lahan (Ha)</h6>
                        <div class="d-flex justify-content-between align-items-end">
                            <h2 class="fw-bold mb-0">{{ luasTerpilih }}</h2>
                            <select v-model="selectedId" class="form-select form-select-sm w-50 text-dark border-0 shadow-none" style="opacity: 0.9;">
                                <option v-for="item in items" :key="item.alsintan_id" :value="item.alsintan_id">
                                    {{ item.kode_perangkat }}
                                </option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-md-3">
                <div class="card border-0 shadow-sm h-100" :class="warningList.length > 0 ? 'bg-danger text-white' : 'bg-light'">
                    <div class="card-body">
                        <h6 :class="warningList.length > 0 ? 'text-white-50' : 'text-muted'">Perlu Perhatian</h6>
                        <h2 class="fw-bold mb-0">{{ warningList.length }} <small class="fs-6">Isu</small></h2>
                        <small v-if="warningList.length > 0" class="d-block mt-1 text-white-50" style="font-size: 10px;">
                            *Aki lemah atau status rusak
                        </small>
                    </div>
                </div>
            </div>
        </div>

        <div class="row g-3 mb-4">
            <div class="col-lg-8">
                <div class="card border-0 shadow-sm h-100">
                    <div class="card-header bg-white fw-bold py-3 d-flex justify-content-between align-items-center">
                        <span><i class="bi bi-map me-2"></i> Sebaran Armada</span>
                        <span class="badge bg-success" v-if="totalLive > 0">Live Mode</span>
                    </div>
                    <div class="card-body p-0">
                        <div id="global-map" style="height: 400px; width: 100%;"></div>
                    </div>
                </div>
            </div>

            <div class="col-lg-4">
                <div class="d-flex flex-column gap-3 h-100">
                    <div class="card border-0 shadow-sm flex-fill">
                        <div class="card-header bg-white fw-bold py-3">Status Operasional</div>
                        <div class="card-body d-flex justify-content-center align-items-center" style="height: 200px;">
                            <canvas id="statusChart"></canvas>
                        </div>
                    </div>
                    
                    <div class="card border-0 shadow-sm flex-fill">
                        <div class="card-header bg-danger text-white fw-bold py-2 small">
                            Unit Bermasalah
                        </div>
                        <div class="card-body p-0 overflow-auto" style="max-height: 150px;">
                            <ul class="list-group list-group-flush">
                                <li v-for="w in warningList" :key="w.alsintan_id" 
                                    class="list-group-item d-flex justify-content-between align-items-center"
                                    @click="goToDetail(w.alsintan_id)" style="cursor: pointer;">
                                    <div>
                                        <div class="fw-bold text-danger">{{ w.nama_alat }}</div>
                                        <small class="text-muted" style="font-size:11px;">
                                            Aki: {{ w.tegangan_aki }}V | {{ w.status_operasional }}
                                        </small>
                                    </div>
                                    <i class="bi bi-chevron-right"></i>
                                </li>
                                <li v-if="warningList.length === 0" class="list-group-item text-center text-muted py-4">
                                    <small>Semua sistem aman ✅</small>
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

<style>
/* CSS UNTUK MAP ICON */
.custom-tractor-icon {
    background: transparent;
    border: none;
}
/* Efek Pulse di Peta untuk Mesin ON */
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

/* CSS UNTUK KARTU 'SEDANG AKTIF' (RADAR) */
.radar-container {
    position: relative;
    width: 40px; height: 40px;
    display: flex;
    justify-content: center;
    align-items: center;
}
.radar-ring {
    position: absolute;
    width: 100%; height: 100%;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.6);
    animation: radarExpand 2s infinite ease-out;
}
.radar-ring.delay-1 {
    animation-delay: 0.6s;
}
@keyframes radarExpand {
    0% { transform: scale(0.5); opacity: 1; }
    100% { transform: scale(1.5); opacity: 0; }
}
</style>