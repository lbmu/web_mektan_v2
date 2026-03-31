<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Swal from 'sweetalert2';

const MQTT_BROKER = import.meta.env.VITE_MQTT_BROKER;
const MQTT_TOPIC = import.meta.env.VITE_MQTT_TOPIC;
// const MQTT_USERNAME = import.meta.env.VITE_MQTT_USERNAME;
// const MQTT_PASSWORD = import.meta.env.VITE_MQTT_PASSWORD;

const route = useRoute();
const router = useRouter();
const id = route.params.id;

// --- STATE ---
const activeTab = ref('LIVE'); 
const infoAlat = ref({});

const getTodayDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const statusMesin = ref('OFF');
const teganganAki = ref(0);
const totalHM = ref(0); 

// State Live Mode
const totalJarakLive = ref(0); 
const historyCoordsLive = ref([]); 

// State History Mode
const historyDate = ref(getTodayDate()); // Default hari ini
const historyCoordsPast = ref([]);
const totalJarakPast = ref(0);
const tarifPerHa = ref(1500000); // Rp 1.500.000 per Hektar

// Local State Map
let map = null;
let polyline = null; // Garis lintasan
let marker = null;
let mqttClient = null;

// --- INIT DATA ALAT ---
const fetchData = async () => {
    try {
        const resALat = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/alsintan/${id}`);
        const data = resALat.data;
        infoAlat.value = data;
        statusMesin.value = data.status_mesin || 'OFF';
        totalJarakLive.value = parseFloat(data.total_jarak_kerja || 0);
        totalHM.value = parseFloat(data.total_hour_meter || 0);
        teganganAki.value = parseFloat(data.tegangan_aki || 0);
        
        // Ambil riwayat live (sejak reset terakhir)
        const resHistory = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/alsintan/${id}/riwayat`);
        historyCoordsLive.value = resHistory.data.map(h => [parseFloat(h.latitude), parseFloat(h.longitude)]);

        initMap();
        connectMqtt();
    } catch (error) {
        console.error("Error load data:", error);
    }
};

// --- LOGIKA PETA ---
const initMap = () => {
    const container = document.getElementById('monitor-map');
    if (!container) return;
    if (map) { map.remove(); map = null; }

    const startPos = historyCoordsLive.value.length > 0 
        ? historyCoordsLive.value[historyCoordsLive.value.length - 1] 
        : [-6.9175, 107.6191];

    map = L.map('monitor-map').setView(startPos, 17);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);

    const tractorIcon = L.divIcon({
        className: 'custom-div-icon',
        html: "<div style='background-color:#0d6efd; width:16px; height:16px; border-radius:50%; border:2px solid white; box-shadow:0 0 5px rgba(0,0,0,0.5);'></div>",
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });

    marker = L.marker(startPos, { icon: tractorIcon }).addTo(map).bindPopup(`<b>${infoAlat.value.nama_alat || 'Alat'}</b>`).openPopup();
    
    renderPolyline();
};

const renderPolyline = () => {
    if (polyline) map.removeLayer(polyline);
    
    // Tentukan array kordinat mana yang akan digambar berdasarkan Tab
    const coordsToDraw = activeTab.value === 'LIVE' ? historyCoordsLive.value : historyCoordsPast.value;
    const lineColor = activeTab.value === 'LIVE' ? 'blue' : 'red';

    if (coordsToDraw.length > 0) {
        polyline = L.polyline(coordsToDraw, { color: lineColor, weight: 4, opacity: 0.8 }).addTo(map);
        map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
    }
};

// --- LOGIKA FETCH HISTORY BERDASARKAN TANGGAL ---
const fetchHistoryByDate = async () => {
    try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/alsintan/${id}/riwayat?tanggal=${historyDate.value}`);
        const dataCoords = response.data.map(h => [parseFloat(h.latitude), parseFloat(h.longitude)]);
        historyCoordsPast.value = dataCoords;

        // Hitung jarak manual khusus hari itu
        totalJarakPast.value = 0;
        if (dataCoords.length > 1) {
            for (let i = 1; i < dataCoords.length; i++) {
                totalJarakPast.value += map.distance(dataCoords[i-1], dataCoords[i]);
            }
        }
        renderPolyline();
    } catch (error) {
        console.error("Gagal load history spesifik:", error);
    }
};

// --- MQTT (Hanya Berpengaruh di Tab Live) ---
const connectMqtt = () => {
    if (!window.mqtt) return;
    mqttClient = window.mqtt.connect(MQTT_BROKER);
    
    mqttClient.on('connect', () => {
        console.log("📡 Connected to MQTT (Detail View)");
        mqttClient.subscribe(MQTT_TOPIC);
    });

    mqttClient.on('message', (topic, message) => {
        try {
            const data = JSON.parse(message.toString());
            
            // PASTIKAN ID ALAT COCOK SEBELUM MEMPROSES DATA
            if (data.id_alat == id) {
                // 1. UPDATE STATUS MESIN (Ini yang membuat status ON/OFF berubah)
                statusMesin.value = data.status_mesin;

                // 2. TANGKAP KOORDINAT BARU
                const newPoint = [parseFloat(data.lat), parseFloat(data.long)];

                // 3. GESER MARKER TRAKTOR
                if (marker && activeTab.value === 'LIVE') {
                    marker.setLatLng(newPoint);
                    map.panTo(newPoint);
                }

                // 4. GAMBAR GARIS & HITUNG JARAK (HANYA JIKA MESIN ON)
                if (statusMesin.value === 'ON') {
                    // Tambahkan titik baru ke garis lintasan
                    if (activeTab.value === 'LIVE' && polyline) {
                        polyline.addLatLng(newPoint);
                    }
                    
                    // Hitung jarak dari titik sebelumnya
                    const lastPoint = historyCoordsLive.value[historyCoordsLive.value.length - 1];
                    if (lastPoint) {
                        const dist = map.distance(lastPoint, newPoint);
                        // Hanya hitung jika jarak lebih dari 0.5 meter untuk mencegah GPS noise
                        if (dist > 0.5) {
                            totalJarakLive.value += dist;
                        }
                    }
                    // Simpan koordinat baru ke dalam array history
                    historyCoordsLive.value.push(newPoint);
                }
            }
        } catch (err) {
            console.error("MQTT parsing error:", err);
        }
    });
};

// --- COMPUTED ESTIMASI ---
const luasHektar = computed(() => {
    const jarak = activeTab.value === 'LIVE' ? totalJarakLive.value : totalJarakPast.value;
    return jarak / 2500;
});
const estimasiBiaya = computed(() => luasHektar.value * tarifPerHa.value);

// --- AKSI RESET ---
const resetArgo = async () => {
    const confirm = await Swal.fire({
        title: 'Reset Argo (Sesi Baru)?',
        text: "Jarak Live akan dikembalikan ke 0. Lakukan ini saat pindah ke lahan petani lain.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, Reset!'
    });

    if (confirm.isConfirmed) {
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/alsintan/${id}/reset`);
            totalJarakLive.value = 0;
            historyCoordsLive.value = [];
            if (activeTab.value === 'LIVE') renderPolyline();
            Swal.fire('Sesi Baru Dimulai!', '', 'success');
        } catch (error) {
            Swal.fire('Gagal reset', '', 'error');
        }
    }
};

// --- WATCHERS ---
watch(activeTab, (newTab) => {
    if (newTab === 'HISTORY') fetchHistoryByDate();
    else renderPolyline(); // Balik ke Live
});

watch(historyDate, () => {
    if (activeTab.value === 'HISTORY') fetchHistoryByDate();
});

onMounted(() => fetchData());
onUnmounted(() => { if (mqttClient) mqttClient.end(); });
</script>

<template>
  <div class="container-fluid pb-4">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div>
        <h4 class="fw-bold mb-0">📡 Dashboard Kendali: {{ infoAlat.nama_alat }}</h4>
        <div class="d-flex align-items-center mt-1 gap-2">
            <span class="badge border border-secondary text-secondary">{{ infoAlat.kode_perangkat }}</span>
            <span class="badge" :class="statusMesin === 'ON' ? 'bg-success animate-pulse' : 'bg-dark text-white-50'">
              <i class="bi bi-power"></i> MESIN: {{ statusMesin }}
            </span>
        </div>
      </div>
      <button @click="router.back()" class="btn btn-outline-secondary btn-sm shadow-sm">
          <i class="bi bi-arrow-left"></i> Kembali ke Radar
      </button>
    </div>

    <div class="row g-3">
      <div class="col-lg-8">
        <div class="card shadow-sm border-0 h-100 position-relative overflow-hidden">
          
          <div class="position-absolute top-0 start-50 translate-middle-x mt-3 z-3 bg-white rounded-pill shadow-sm p-1 d-flex gap-1 border">
              <button class="btn btn-sm rounded-pill px-4 fw-bold" 
                      :class="activeTab === 'LIVE' ? 'btn-primary' : 'btn-light text-muted'"
                      @click="activeTab = 'LIVE'">
                  <i class="bi bi-broadcast"></i> Live Mode
              </button>
              <button class="btn btn-sm rounded-pill px-4 fw-bold" 
                      :class="activeTab === 'HISTORY' ? 'btn-danger' : 'btn-light text-muted'"
                      @click="activeTab = 'HISTORY'">
                  <i class="bi bi-clock-history"></i> Riwayat Lintasan
              </button>
          </div>

          <div v-if="activeTab === 'LIVE' && statusMesin === 'OFF'" 
               class="position-absolute bottom-0 start-0 w-100 bg-dark bg-opacity-75 text-white text-center p-2 z-3"
               style="font-size: 12px;">
               <i class="bi bi-info-circle text-warning"></i> Traktor sedang parkir/transport. Argo jarak tidak dihitung.
          </div>

          <div id="monitor-map" style="height: 550px; width: 100%;"></div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card border-0 shadow-sm h-100">
          
          <div class="card-header py-3" :class="activeTab === 'LIVE' ? 'bg-primary text-white' : 'bg-danger text-white'">
             <h6 class="mb-0 fw-bold text-center">
                 <i class="bi" :class="activeTab === 'LIVE' ? 'bi-speedometer2' : 'bi-receipt'"></i> 
                 {{ activeTab === 'LIVE' ? 'PANEL TELEMETRI LIVE' : 'PEMBUKUAN & ESTIMASI' }}
             </h6>
          </div>

          <div class="card-body bg-light d-flex flex-column gap-3">
            
            <div v-if="activeTab === 'HISTORY'" class="bg-white p-3 rounded border shadow-sm">
                <label class="small fw-bold text-muted mb-1">Pilih Tanggal Operasi:</label>
                <input type="date" v-model="historyDate" class="form-control">
            </div>

            <div class="card border-0 shadow-sm bg-white">
              <div class="card-body text-center">
                <span class="text-muted small text-uppercase fw-bold">Estimasi Luas Tergarap</span>
                <h2 class="display-4 fw-bold my-2" :class="activeTab === 'LIVE' ? 'text-primary' : 'text-danger'">
                  {{ luasHektar.toFixed(3) }} <span class="fs-6 text-muted">Ha</span>
                </h2>
                <small class="text-muted border-top pt-2 d-block">
                  Jarak Kerja: {{ ((activeTab === 'LIVE' ? totalJarakLive : totalJarakPast) / 1000).toFixed(2) }} km
                </small>
              </div>
            </div>

            <div v-if="activeTab === 'LIVE'" class="row g-2">
              <div class="col-6">
                <div class="card border-0 shadow-sm bg-white h-100">
                  <div class="card-body text-center p-2">
                    <small class="text-muted d-block mb-1">Hour Meter</small>
                    <h5 class="fw-bold mb-0 text-dark">{{ totalHM }} <small>Jam</small></h5>
                  </div>
                </div>
              </div>
              <div class="col-6">
                <div class="card border-0 shadow-sm bg-white h-100">
                  <div class="card-body text-center p-2">
                    <small class="text-muted d-block mb-1">Voltase Aki</small>
                    <h5 class="fw-bold mb-0 text-success">{{ teganganAki }} <small>V</small></h5>
                  </div>
                </div>
              </div>
            </div>

            <div class="card border border-warning shadow-sm bg-warning bg-opacity-10 mt-auto">
              <div class="card-body">
                <label class="small text-muted fw-bold d-block mb-1">Tarif Jasa per Hektar</label>
                <div class="input-group input-group-sm mb-3">
                    <span class="input-group-text bg-white">Rp</span>
                    <input type="number" v-model="tarifPerHa" class="form-control fw-bold border-start-0">
                </div>
                <div class="d-flex justify-content-between align-items-center border-top border-warning pt-2">
                  <span class="fw-bold text-warning-emphasis">Total Tagihan</span>
                  <span class="h5 mb-0 fw-bold text-dark">Rp {{ estimasiBiaya.toLocaleString('id-ID') }}</span>
                </div>
              </div>
            </div>

            <button @click="resetArgo" class="btn btn-dark w-100 shadow-sm py-2">
                <i class="bi bi-arrow-repeat"></i> Reset Argo (Mulai Lahan Baru)
            </button>

          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-pulse { animation: pulse 1s infinite; }
@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
.z-3 { z-index: 1000 !important; }
</style>