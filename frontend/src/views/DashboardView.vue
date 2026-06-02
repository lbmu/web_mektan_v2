<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useRouter } from 'vue-router';

const router = useRouter();
const items = ref([]); 
const loading = ref(true);
const selectedAlat = ref(null);

// State Peta & MQTT
let map = null;
let markers = {}; 
let mqttClient = null;
let chartInstance = null;
let speedoChartInstance = null;

const MQTT_HOST = import.meta.env.VITE_MQTT_HOST;
const MQTT_PORT = Number(import.meta.env.VITE_MQTT_PORT);
const MQTT_TOPIC = import.meta.env.VITE_MQTT_TOPIC;
const MQTT_USERNAME = import.meta.env.VITE_MQTT_USERNAME;
const MQTT_PASSWORD = import.meta.env.VITE_MQTT_PASSWORD;

const currentTime = ref('');
const currentDate = ref('');
let clockInterval = null;

const updateClock = () => {
    const now = new Date();
    // Format Jam: 14:30:45 WIB
    currentTime.value = now.toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    }) + ' WIB';

    // Format Tanggal: Selasa, 14 April 2026
    currentDate.value = now.toLocaleDateString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
};

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

// --- MQTT UNTUK DASHBOARD VIEW ---
const connectMqtt = () => {
    const options = {
        host: MQTT_HOST,
        port: MQTT_PORT,
        protocol: 'wss', // Jalur aman yang terbukti sukses
        path: '/mqtt',
        username: MQTT_USERNAME,
        password: MQTT_PASSWORD
    };

    mqttClient = mqtt.connect(options);

    mqttClient.on('connect', () => {
        console.log("📡 Connected to MQTT (Dashboard View - JSON Baru)");
        mqttClient.subscribe(MQTT_TOPIC);
    });

    mqttClient.on('message', (topic, message) => {
        try {
            const data = JSON.parse(message.toString());
            
            // 1. SESUAIKAN PENCARIAN ID (Gunakan data.id, bukan data.id_alat)
            const index = items.value.findIndex(i => i.alsintan_id == data.id);
            
            if (index !== -1) {
                // 2. PARSING DATA BARU
                const tegangan = parseFloat(data.V) || 0;
                // Logika otomatis mesin (disamakan dengan MonitoringDetail: >= 13.0V)
                const statusMesinBaru = tegangan > 13.0 ? 'ON' : 'OFF'; 
                const lat = parseFloat(data.lat);
                const long = parseFloat(data.long || data.lng);

                // 3. UPDATE DATA REAKTIF (Untuk mengubah angka di kartu atas)
                items.value[index].status_mesin = statusMesinBaru;
                items.value[index].latitude = lat;
                items.value[index].longitude = long;
                items.value[index].tegangan_aki = tegangan; 
                items.value[index].arus = parseFloat(data.I) || 0;
                
                // Ganti bbm_persen dengan bbm
                items.value[index].bbm = parseFloat(data.bbm) || 0; 
                
                // Tambahkan parameter sinyal (Opsional jika ingin ditampilkan di Dashboard)
                items.value[index].hdop = parseInt(data.hd) || 0;
                items.value[index].satelit = parseInt(data.st) || 0;

                // [PENTING] Speedometer sudah dihapus, jadi tidak perlu di-update lagi.
                
                if (selectedAlat.value && selectedAlat.value.alsintan_id == data.id) {
                    selectedAlat.value = items.value[index];
                    
                    // ⚠️ CATATAN: Jika initSpeedoChart() sebelumnya menggunakan data speedometer, 
                    // fungsi itu mungkin akan error sekarang. Sebaiknya ubah chart tersebut 
                    // menjadi Chart Arus/Tegangan, atau hapus baris di bawah ini jika chart sudah dihapus.
                    // nextTick(() => initSpeedoChart()); 
                }

                // 4. UPDATE MARKER PETA (Hanya jika koordinat valid)
                if (lat !== 0 && long !== 0 && !isNaN(lat)) {
                    updateMarker(data.id, lat, long, statusMesinBaru);
                }
                
                // 5. UPDATE CHART SECARA REAL-TIME
                initChart(); 
            }
        } catch (err) {
            console.error("Gagal parsing MQTT di Dashboard:", err);
        }
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

    const mapContainer = document.getElementById('global-map');
    if (mapContainer) {
        const resizeObserver = new ResizeObserver(() => {
            if (map) map.invalidateSize();
        });
        resizeObserver.observe(mapContainer);
    }
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
                    Lat: ${lat.toFixed(4)}, Long: ${lng.toFixed(4)}`)
        .on('click', () => {
            selectedAlat.value = alat;
        });
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
        // HANYA UPDATE CHART JIKA DATA BENAR-BENAR BERUBAH (Menghilangkan Delay/Lag)
        const oldData = chartInstance.data.datasets[0].data;
        if (JSON.stringify(oldData) !== JSON.stringify(newData)) {
            chartInstance.data.datasets[0].data = newData;
            chartInstance.update(); 
        }
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
                // Matikan animasi saat data realtime update agar tidak lag
                animation: false, 
                plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } } },
                cutout: '78%' // Cincin tipis yang sudah kita buat sebelumnya
            }
        });
    }
};

const initSpeedoChart = () => {
    const ctx = document.getElementById('speedoGauge');
    if (!ctx || !selectedAlat.value) return;

    // Menangkap nilai speedometer (0-15 km/jam)
    const speedValue = selectedAlat.value.speedometer || 0;
    const maxSpeed = 20; 

    const data = {
        datasets: [{
            data: [speedValue, maxSpeed - speedValue],
            backgroundColor: [
                speedValue > 12 ? '#dc3545' : '#198754', // Merah jika > 12 Km/Jam (Kecepatan tinggi untuk panen)
                '#e9ecef'
            ],
            borderWidth: 0,
            circumference: 180,
            rotation: 270,
            cutout: '85%'
        }]
    };

    if (speedoChartInstance) {
        speedoChartInstance.data.datasets[0].data = [speedValue, maxSpeed - speedValue];
        speedoChartInstance.data.datasets[0].backgroundColor[0] = speedValue > 12 ? '#dc3545' : '#198754';
        speedoChartInstance.update('none');
    } else {
        speedoChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { tooltip: { enabled: false }, legend: { display: false } },
                animation: { duration: 0 }
            }
        });
    }
};

const goToDetail = (id) => router.push({ name: 'monitoring-detail', params: { id } });

onMounted(() => {
    fetchData();
    // Jalankan jam segera, lalu perbarui setiap 1 detik (1000 ms)
    updateClock();
    clockInterval = setInterval(updateClock, 1000);
});

onUnmounted(() => { 
    if(mqttClient) mqttClient.end(); 
    // Hapus interval jam saat pindah halaman
    if(clockInterval) clearInterval(clockInterval);
});
</script>

<template>
  <div class="container-fluid pb-5">
    
    <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
        <div>
            <h3 class="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
                <i class="bi bi-broadcast text-primary"></i> 
                Pusat Kendali MyMektan
            </h3>
            <p class="text-muted mb-0" style="font-size: 0.9rem;">
                Monitoring Armada & Telemetri Real-Time Balai Mektan Jawa Barat
            </p>
        </div>

        <div class="d-flex align-items-center gap-3 bg-light px-4 py-2 rounded-pill shadow-sm border">
            <div class="d-flex align-items-center gap-2 border-end pe-3">
                <div class="spinner-grow text-success" style="width: 12px; height: 12px;" role="status">
                    <span class="visually-hidden">Online</span>
                </div>
                <span class="fw-bold text-success" style="font-size: 0.8rem; letter-spacing: 1px;">SISTEM ONLINE</span>
            </div>
            <div class="text-end">
                <div class="fw-bold text-dark" style="font-size: 1.1rem; line-height: 1.2;">
                    {{ currentTime }}
                </div>
                <div class="text-muted" style="font-size: 0.75rem;">
                    {{ currentDate }}
                </div>
            </div>
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
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-0 shadow-sm bg-info text-white h-100 position-relative overflow-hidden">
                    <div class="card-body position-relative z-1">
                        <h6 class="text-white-50 mb-2 text-uppercase fw-bold" style="font-size: 11px;">Total Cakupan Lahan</h6>
                        <h2 class="fw-bold mb-0">{{ totalLuasLahanGlobal }} <small class="fs-6">Ha</small></h2>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-0 shadow-sm h-100 bg-danger text-white">
                    <div class="card-body">
                        <h6 class="text-white-50">Perlu Perhatian</h6>
                        <h2 class="fw-bold mb-0">{{ warningList.length }} <small class="fs-6">Isu</small></h2>
                    </div>
                </div>
            </div>
        </div>

        <div class="row g-3 mb-4">
            <div class="col-lg-8">
                <div class="card border-0 shadow-sm h-100 d-flex flex-column">
                    <div class="card-header bg-white fw-bold py-3 d-flex justify-content-between align-items-center">
                        <span><i class="bi bi-map me-2"></i> Sebaran Armada Keseluruhan</span>
                        <span class="badge bg-success" v-if="totalLive > 0"><i class="bi bi-broadcast"></i> Live Mode Active</span>
                    </div>
                    <div class="card-body p-0 d-flex flex-column flex-grow-1">
                        <div id="global-map" class="flex-grow-1" style="min-height: 450px; width: 100%; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px;"></div>
                    </div>
                </div>
            </div>

            <div class="col-lg-4">
                <div class="d-flex flex-column gap-3 h-100">
                    
                    <div class="card border-0 shadow-sm flex-fill">
                        <div class="card-header bg-white fw-bold py-3"><i class="bi bi-pie-chart-fill me-2 text-primary"></i> Rasio Kondisi Fisik</div>
                        <div class="card-body">
                            <div style="height: 200px; position: relative;">
                                <canvas id="statusChart"></canvas>
                                <div class="position-absolute start-50 translate-middle text-center" style="top: 35%; pointer-events: none;">
                                    <div class="fw-bolder" style="font-size: 2.5rem; color: #1e293b; line-height: 1;">{{ totalAset }}</div>
                                    <div class="text-uppercase fw-bold" style="font-size: 0.6rem; color: #94a3b8; letter-spacing: 2px;">Unit</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card border-0 shadow-sm flex-fill">
                        <div class="card-header bg-dark text-white fw-bold py-2 small d-flex justify-content-between align-items-center">
                            <span><i class="bi bi-speedometer2 me-1 text-info"></i> Telemetri Live</span>
                            <span class="badge bg-secondary" v-if="!selectedAlat">Standby</span>
                            <span class="badge bg-primary" v-else>{{ selectedAlat.kode_perangkat }}</span>
                        </div>
                        
                        <div class="card-body p-3 d-flex flex-column justify-content-center align-items-center" v-if="!selectedAlat">
                            <i class="bi bi-cursor-fill fs-3 text-muted opacity-50 mb-2"></i>
                            <span class="text-muted small text-center px-3">Pilih unit pada peta untuk memantau performa mesin.</span>
                        </div>

                        <div class="card-body p-3 d-flex flex-column justify-content-center" v-else>
                            
                            <div class="row g-0 mb-3 border-bottom pb-2">
                                <div class="col-6 border-end text-center px-2">
                                    <small class="text-muted fw-bold d-block" style="font-size: 9px; letter-spacing: 0.5px;">VOLTASE AKI</small>
                                    <span class="fw-bolder" :class="selectedAlat.tegangan_aki < 11.5 ? 'text-danger' : 'text-success'" style="font-size: 1.2rem;">
                                        {{ selectedAlat.tegangan_aki }}<span class="fs-6 fw-normal ms-1">V</span>
                                    </span>
                                </div>
                                <div class="col-6 text-center px-2">
                                    <small class="text-muted fw-bold d-block" style="font-size: 9px; letter-spacing: 0.5px;">ARUS BEBAN</small>
                                    <span class="fw-bolder text-info" style="font-size: 1.2rem;">
                                        {{ selectedAlat.arus }}<span class="fs-6 fw-normal ms-1">A</span>
                                    </span>
                                </div>
                            </div>

                            <div class="position-relative mb-2" style="height: 120px;" v-show="selectedAlat.speedometer > 0 || selectedAlat.bbm_persen > 0">
                                <canvas id="speedoGauge"></canvas>
                                <div class="position-absolute start-50 translate-middle-x text-center" style="bottom: 5px;">
                                    <div class="fw-bolder mb-0" style="font-size: 1.8rem; line-height: 1;" :class="(selectedAlat.speedometer || 0) > 12 ? 'text-danger' : 'text-dark'">
                                        {{ selectedAlat.speedometer || 0 }}
                                    </div>
                                    <div class="text-muted fw-bold" style="font-size: 0.6rem; letter-spacing: 1px;">KM/H</div>
                                </div>
                            </div>

                            <div class="mt-3" v-show="selectedAlat.speedometer > 0 || selectedAlat.bbm_persen > 0">
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                    <small class="fw-bold text-muted" style="font-size: 10px;">LEVEL BAHAN BAKAR</small>
                                    <small class="fw-bold" :class="(selectedAlat.bbm_persen || 0) < 20 ? 'text-danger' : 'text-warning'">
                                        {{ selectedAlat.bbm_persen || 0 }}% <span class="text-muted fw-normal">({{ (((selectedAlat.bbm_persen || 0) / 100) * 60).toFixed(1) }}L)</span>
                                    </small>
                                </div>
                                <div class="progress" style="height: 8px; border-radius: 10px;">
                                    <div class="progress-bar progress-bar-striped progress-bar-animated" 
                                         :class="(selectedAlat.bbm_persen || 0) < 20 ? 'bg-danger' : 'bg-warning'"
                                         :style="{ width: (selectedAlat.bbm_persen || 0) + '%' }">
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                    <div class="card border-0 shadow-sm flex-fill">
                        <div class="card-header bg-danger text-white fw-bold py-2 small d-flex justify-content-between align-items-center">
                            <span><i class="bi bi-exclamation-triangle-fill me-1"></i> Log Peringatan</span>
                            <span class="badge bg-white text-danger">{{ warningList.length }}</span>
                        </div>
                        <div class="card-body p-0 overflow-auto custom-scrollbar" style="max-height: 150px;">
                            <ul class="list-group list-group-flush">
                                <li v-for="w in warningList" :key="w.alsintan_id" 
                                    class="list-group-item d-flex justify-content-between align-items-center list-group-item-action"
                                    @click="goToDetail(w.alsintan_id)" style="cursor: pointer;">
                                    <div>
                                        <div class="fw-bold text-danger" style="font-size: 12px;">{{ w.nama_alat }}</div>
                                        <small class="text-muted" style="font-size:10px;">
                                            Aki: <span :class="w.tegangan_aki < 11.5 ? 'text-danger fw-bold' : ''">{{ w.tegangan_aki }}V</span> | 
                                            {{ w.status_operasional }}
                                        </small>
                                    </div>
                                    <i class="bi bi-chevron-right text-muted small"></i>
                                </li>
                                <li v-if="warningList.length === 0" class="list-group-item text-center text-muted py-4 border-0">
                                    <i class="bi bi-check-circle text-success fs-4 d-block mb-1"></i>
                                    <small>Sistem aman</small>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="text-center mt-4 pt-3 border-top text-muted" style="font-size: 0.75rem; letter-spacing: 0.5px;">
            &copy; 2026 Balai Pengembangan Mekanisasi Pertanian - Pemprov Jawa Barat. Versi 1.1.0
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