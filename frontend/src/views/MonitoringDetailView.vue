<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MQTT_BROKER = 'ws://broker.hivemq.com:8000/mqtt';
const MQTT_TOPIC = 'project-mektan/v1/data'; 

const route = useRoute();
const router = useRouter();
const id = route.params.id;

// --- STATE ---
const infoAlat = ref({});
const statusMesin = ref('OFF'); // ON / OFF
const teganganAki = ref(0);
const totalJarak = ref(0); // Meter (Akumulasi dari DB + Live)
const totalHM = ref(0); // Hour Meter (Jam)

//Local State Map
const historyCoords = ref([]); 
let map = null;
let polyline = null;
let marker = null;
let mqttClient = null;

const fetchData = async () => {
    try {
        const resALat = await axios.get(`http://localhost:3000/api/alsintan/${id}`);
        const data = resALat.data;

        infoAlat.value = data;

        //State awal
        statusMesin.value = data.status_mesin || 'OFF';
        totalJarak.value = parseFloat(data.total_jarak_kerja || 0);
        totalHM.value = parseFloat(data.total_hour_meter || 0);
        teganganAki.value = parseFloat(data.tegangan_aki || 0);
        
        const resHistory = await axios.get(`http://localhost:3000/api/alsintan/${id}/riwayat`);
        historyCoords.value = resHistory.data.map(h => [parseFloat(h.latitude), parseFloat(h.longitude)]);

        initMap();
        connectMqtt();

    } catch (error) {
    console.error("Error load data:", error);
    }
};

const initMap = () => {
    const container = document.getElementById('monitor-map');
    if (!container) return;

    const startPos = historyCoords.value.length > 0 
    ? historyCoords.value[historyCoords.value.length - 1] 
    : [-6.974001, 107.630001];

    if (map) { map.remove(); map = null; }

    map = L.map('monitor-map').setView(startPos, 18);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const tractorIcon = L.divIcon({
        className: 'custom-div-icon',
        html: "<div style='background-color:#0d6efd; width:15px; height:15px; border-radius:50%; border:2px solid white; box-shadow:0 0 5px rgba(0,0,0,0.5);'></div>",
        iconSize: [15, 15],
        iconAnchor: [7, 7]
    });

    marker = L.marker(startPos, { icon: tractorIcon }).addTo(map)
        .bindPopup(`<b>${infoAlat.value.nama_alat}</b><br>Sedang Beroperasi`).openPopup();

    polyline = L.polyline(historyCoords.value, { color: 'red', weight: 4}).addTo(map);
};

const connectMqtt = () => {
    if (!window.mqtt) {
        console.error("Library MQTT belum terload! Cek koneksi internet.");
        return;
    }

    mqttClient = mqtt.connect(MQTT_BROKER);

    mqttClient.on('connect', () => {
        console.log("Monitoring Terhubung ke MQTT");
    mqttClient.subscribe(MQTT_TOPIC);
    });

    mqttClient.on('message', (topic, message) => {
    try {
        const data = JSON.parse(message.toString());
    
    // Cek apakah data ini milik alat yang sedang dibuka?
        if (data.id_alat == id) {

            statusMesin.value = data.status_mesin;

            const newPoint = [parseFloat(data.lat), parseFloat(data.long)];

      // Geser Marker
            if (marker) marker.setLatLng(newPoint);
            if (map) map.panTo(newPoint);

        // Update Hour Meter jika mesin ON
            if (statusMesin.value === 'ON') {
        
      // Tambah Garis
                if (polyline) polyline.addLatLng(newPoint);

      // Tambah Hitungan Jarak (Argo)
                const lastPoint = historyCoords.value[historyCoords.value.length - 1];
                if (lastPoint) {
                    const dist = map.distance(lastPoint, newPoint);

                    if (dist > 0.5){  // Filter noise kecil
                        totalJarak.value += dist;
                    }
                }
                historyCoords.value.push(newPoint);

                }  else {
                    // Jika Mesin OFF: Marker bergerak tapi garis TIDAK ditarik
                    // (Status Transport / Parkir)
                }
            }
        }   catch (err) {
            console.error("MQTT Error:", err);
        }
    });
};

//Rumus Estimasi (Konversi meter ke hektar & biaya)
const luasHektar = computed(() => {
    return totalJarak.value / 2500;
});

// Estimasi Biaya (Misal Rp 1.000.000 per Hektar - Placeholder)
const estimasiBiaya = computed(() => {
    return luasHektar.value * 1000000; 
});

const resetArgo = async () => {
    if (!confirm("Reset Argo? Jarak akan kembali ke 0 untuk sesi lahan baru.")) return;

    try {
        await axios.post(`http://localhost:3000/api/alsintan/${id}/reset`);
        // Reset state lokal
        totalJarak.value = 0;
        historyCoords.value = []; // Kosongkan array history lokal
    
        // Re-init map agar garis merah hilang
        initMap(); 
    
        alert("Sesi Baru Dimulai!");
    }   catch (error) {
        alert("Gagal reset");
    }
};

onMounted(() => {
    fetchData();
});

onUnmounted(() => {
    if (mqttClient) mqttClient.end();
});

</script>

<template>
  <div class="container-fluid">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div>
        <h4 class="fw-bold mb-0">📡 Smart Monitoring: {{ infoAlat.nama_alat }}</h4>
        <div class="d-flex align-items-center mt-1 gap-3">
            <span class="badge bg-secondary">{{ infoAlat.kode_perangkat }}</span>
            <span class="badge" 
                  :class="statusMesin === 'ON' ? 'bg-success animate-pulse' : 'bg-dark text-white-50'">
              <i class="bi bi-power"></i> MESIN: {{ statusMesin }}
            </span>
        </div>
      </div>
      <button @click="router.back()" class="btn btn-outline-secondary btn-sm">Kembali</button>
    </div>

    <div class="row g-3">
      <div class="col-lg-8">
        <div class="card shadow-sm border-0 h-100">
          <div class="card-body p-0 position-relative">
            <div v-if="statusMesin === 'OFF'" 
                 class="position-absolute top-0 start-0 w-100 bg-dark bg-opacity-75 text-white d-flex justify-content-center align-items-center p-2"
                 style="z-index: 1000; height: 40px;">
                 <small>⚠️ Mode Transport/Parkir (Argo Paused)</small>
            </div>
            
            <div id="monitor-map" style="height: 500px; width: 100%;"></div>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-header bg-dark text-white py-3">
             <h6 class="mb-0 fw-bold"><i class="bi bi-speedometer2"></i> PANEL KONTROL LAHAN</h6>
          </div>
          <div class="card-body bg-light d-flex flex-column gap-3">
            
            <div class="card border-0 shadow-sm bg-white">
              <div class="card-body text-center">
                <span class="text-muted small text-uppercase fw-bold">Estimasi Luas Tergarap</span>
                <h2 class="display-4 fw-bold text-success my-2">
                  {{ luasHektar.toFixed(3) }} <span class="fs-6 text-muted">Ha</span>
                </h2>
                <small class="text-muted border-top pt-2 d-block">
                  Jarak Kerja: {{ (totalJarak / 1000).toFixed(2) }} km
                </small>
              </div>
            </div>

            <div class="row g-2">
              <div class="col-6">
                <div class="card border-0 shadow-sm bg-white h-100">
                  <div class="card-body text-center p-2">
                    <small class="text-muted d-block mb-1">Hour Meter</small>
                    <h5 class="fw-bold mb-0">{{ totalHM }} <small>Jam</small></h5>
                  </div>
                </div>
              </div>
              <div class="col-6">
                <div class="card border-0 shadow-sm bg-white h-100">
                  <div class="card-body text-center p-2">
                    <small class="text-muted d-block mb-1">Voltase Aki</small>
                    <h5 class="fw-bold mb-0 text-primary">{{ teganganAki }} <small>V</small></h5>
                  </div>
                </div>
              </div>
            </div>

            <div class="card border-0 shadow-sm bg-warning bg-opacity-10">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                  <span class="fw-bold text-warning-emphasis">Estimasi Biaya</span>
                  <span class="h5 mb-0 fw-bold text-dark">Rp {{ estimasiBiaya.toLocaleString('id-ID') }}</span>
                </div>
              </div>
            </div>

            <div class="mt-auto">
               <button @click="resetArgo" class="btn btn-danger w-100 shadow-sm py-2">
                 <i class="bi bi-arrow-repeat"></i> Reset Sesi Baru
               </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-pulse {
  animation: pulse 1s infinite;
}
@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}
</style>