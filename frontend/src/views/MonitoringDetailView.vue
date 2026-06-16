<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Swal from 'sweetalert2';
import mqtt from 'mqtt';

const MQTT_HOST = import.meta.env.VITE_MQTT_HOST;
const MQTT_PORT = Number(import.meta.env.VITE_MQTT_PORT);
const MQTT_TOPIC = import.meta.env.VITE_MQTT_TOPIC;
const MQTT_USERNAME = import.meta.env.VITE_MQTT_USERNAME;
const MQTT_PASSWORD = import.meta.env.VITE_MQTT_PASSWORD;

const route = useRoute();
const router = useRouter();
const id = route.params.id;

// --- STATE ---
const activeTab = ref('LIVE'); 
const infoAlat = ref({});
const lebarImplemen = ref(1.89); 
const userRole = ref(''); 

const getTodayDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Telemetri Live & Status Ganda
const statusIot = ref('OFF'); 
const statusMesin = ref('UNKNOWN');
const teganganAki = ref(0);
const arus = ref(0);     
const hdop = ref(0);     
const satelit = ref(0);  
const totalHM = ref(0); 

// State Jarak
const jarakMentahSensor = ref(0); 
const jarakBersihValid = ref(0);  
const historyCoordsLive = ref([]); 

// State History Mode (Ditambah HM Harian)
const historyDate = ref(getTodayDate()); 
const historyCoordsPast = ref([]);
const totalJarakPast = ref(0);
const dailyHMPast = ref(0); // State untuk menyimpan Jam Kerja di hari spesifik

// --- STATE TARIF DINAMIS ---
const tarifPerHa = ref(1500000); 
const isSavingTarif = ref(false);

let map = null;
let polyline = null; 
let marker = null;
let mqttClient = null;
let lastMesinStatus = 'UNKNOWN'; 
let syncTimer = null; 

let offlineTimer = null;
const TIMEOUT_BATAS_MS = 600000; 

const getTractorClass = (status) => {
  if (status === 'ON') return 'bg-success text-white animate-pulse';
  if (status === 'OFF') return 'bg-dark text-white-50';
  return 'bg-secondary text-white'; 
};

// --- FUNGSI TARIF DINAMIS ---
const fetchTarif = async () => {
    try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/settings/tarif`);
        tarifPerHa.value = Number(res.data.nilai);
    } catch (e) {
        console.error("Gagal meload tarif dari server");
    }
};

const saveTarif = async () => {
    isSavingTarif.value = true;
    try {
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/settings/tarif`, { nilai: tarifPerHa.value });
        Swal.fire({ 
            toast: true, 
            position: 'top-end', 
            icon: 'success', 
            title: 'Tarif global diperbarui', 
            showConfirmButton: false, 
            timer: 2500 
        });
    } catch (e) {
        Swal.fire('Error', 'Gagal menyimpan tarif', 'error');
    } finally { 
        isSavingTarif.value = false; 
    }
};

const fetchData = async () => {
    try {
        const resALat = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/alsintan/${id}`);
        const data = resALat.data;
        infoAlat.value = data;
        
        lebarImplemen.value = parseFloat(data.lebar_implemen || 1.89);
        jarakBersihValid.value = parseFloat(data.total_jarak_kerja || 0);
        if (jarakMentahSensor.value === 0) jarakMentahSensor.value = jarakBersihValid.value; 

        totalHM.value = parseFloat(data.total_hour_meter || 0);
        teganganAki.value = parseFloat(data.tegangan_aki || 0);
        hdop.value = parseInt(data.hdop || 0);
        satelit.value = parseInt(data.satelit || 0);

        statusIot.value = data.status_iot || 'OFF';
        statusMesin.value = data.status_mesin || 'UNKNOWN';
        
        if (historyCoordsLive.value.length === 0) {
            const resHistory = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/alsintan/${id}/riwayat`);
            historyCoordsLive.value = resHistory.data.map(h => [parseFloat(h.latitude), parseFloat(h.longitude)]);
            initMap();
        }
    } catch (error) {
        console.error("Error load data:", error);
    }
};

const fetchCleanDataOnly = async () => {
    if (activeTab.value !== 'LIVE') return;
    try {
        const resALat = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/alsintan/${id}`);
        jarakBersihValid.value = parseFloat(resALat.data.total_jarak_kerja || 0);
        totalHM.value = parseFloat(resALat.data.total_hour_meter || 0);
    } catch (error) {}
};

const initMap = () => {
    const container = document.getElementById('monitor-map');
    if (!container) return;
    if (map) { map.remove(); map = null; }

    const startPos = historyCoordsLive.value.length > 0 
        ? historyCoordsLive.value[historyCoordsLive.value.length - 1] 
        : [-6.9175, 107.6191];

    map = L.map('monitor-map', { zoomControl: false }).setView(startPos, 17);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const tractorIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `
            <div class="d-flex justify-content-center align-items-center rounded-circle border border-2 border-primary bg-primary bg-opacity-10 shadow-sm position-relative" 
                 style="width: 36px; height: 36px; background-color: white;">
                 <img src="/ikon-traktor.png" style="width: 22px; height: 22px; object-fit: contain;">
            </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20]
    });

    marker = L.marker(startPos, { icon: tractorIcon }).addTo(map).bindPopup(`<b>${infoAlat.value.nama_alat || 'Alat'}</b>`).openPopup();
    
    renderPolyline();
};

const renderPolyline = () => {
    if (polyline) { map.removeLayer(polyline); polyline = null; }
    
    const coordsToDraw = activeTab.value === 'LIVE' ? historyCoordsLive.value : historyCoordsPast.value;
    const lineColor = activeTab.value === 'LIVE' ? 'blue' : 'red';

    if (coordsToDraw.length > 0) {
        polyline = L.polyline(coordsToDraw, { color: lineColor, weight: 4, opacity: 0.8 }).addTo(map);
        map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
    }
};

const fetchHistoryByDate = async () => {
    try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/alsintan/${id}/riwayat?tanggal=${historyDate.value}`);
        const rawData = response.data;
        
        const dataCoords = rawData.map(h => [parseFloat(h.latitude), parseFloat(h.longitude)]);
        historyCoordsPast.value = dataCoords;

        // Hitung Total Jarak
        totalJarakPast.value = 0;
        if (dataCoords.length > 1) {
            for (let i = 1; i < dataCoords.length; i++) {
                totalJarakPast.value += map.distance(dataCoords[i-1], dataCoords[i]);
            }
        }

        // =============================================================
        // LOGIKA BARU: HITUNG HM HARIAN DARI JEJAK WAKTU (waktu_rekam)
        // =============================================================
        let dailyHM = 0;
        if (rawData.length > 1) {
            for (let i = 1; i < rawData.length; i++) {
                const t1 = new Date(rawData[i-1].waktu_rekam).getTime();
                const t2 = new Date(rawData[i].waktu_rekam).getTime();
                const diffMs = t2 - t1;
                
                // Jika selisih antar titik masuk akal (kurang dari 15 Menit / 900.000 ms),
                // maka dianggap mesin sedang hidup/bekerja terus menerus.
                // Jika > 15 Menit, dianggap mesin parkir/dimatikan sementara (jeda).
                if (diffMs > 0 && diffMs <= 900000) {
                    dailyHM += diffMs / 3600000; // Konversi ms ke jam
                }
            }
        }
        dailyHMPast.value = dailyHM;

        renderPolyline();
    } catch (error) {}
};

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
        console.log("📡 Connected to MQTT (Detail View - Watchdog & Anti-Teleport Aktif)");
        mqttClient.subscribe(MQTT_TOPIC);
    });

    mqttClient.on('message', (topic, message) => {
        try {
            const data = JSON.parse(message.toString());
            
            if (data.id == id) {
                if (offlineTimer) clearTimeout(offlineTimer);
                statusIot.value = 'ON';
                
                offlineTimer = setTimeout(() => {
                    console.warn(`⚠️ Traktor ID: ${id} kehilangan sinyal (>10 menit)!`);
                    statusIot.value = 'OFF';
                    statusMesin.value = 'UNKNOWN';
                }, TIMEOUT_BATAS_MS);

                teganganAki.value = parseFloat(data.V) || 0;
                arus.value = parseFloat(data.I) || 0;
                hdop.value = parseInt(data.hd) || 0;
                satelit.value = parseInt(data.st) || 0;

                const statusMesinBaru = teganganAki.value >= 12.8 ? 'ON' : 'OFF';
                statusMesin.value = statusMesinBaru;

                const lat = parseFloat(data.lat);
                const long = parseFloat(data.lng); 
                const isGpsValid = lat && long && !isNaN(lat) && !isNaN(long) && lat !== 0 && long !== 0;
                
                if (isGpsValid) {
                    const newPoint = [lat, long];

                    if (marker && activeTab.value === 'LIVE') {
                        marker.setLatLng(newPoint);
                        map.panTo(newPoint); 
                    }

                    if (statusMesinBaru === 'ON') {
                        if (activeTab.value === 'LIVE') {
                            if (polyline) polyline.addLatLng(newPoint);
                            else renderPolyline(); 
                        }
                        
                        if (lastMesinStatus === 'ON' && historyCoordsLive.value.length > 0) {
                            const lastPoint = historyCoordsLive.value[historyCoordsLive.value.length - 1];
                            const dist = map.distance(lastPoint, newPoint);
                            
                            if (dist > 0.5 && dist < 50) { 
                                jarakMentahSensor.value += dist; 
                            }
                        }
                        historyCoordsLive.value.push(newPoint);
                    }
                    lastMesinStatus = statusMesinBaru;
                }
            }
        } catch (err) {}
    });
};

const luasHektar = computed(() => {
    const jarak = activeTab.value === 'LIVE' ? jarakBersihValid.value : totalJarakPast.value;
    return (jarak * lebarImplemen.value) / 10000;
});

// Konversi Desimal ke Jam, Menit, Detik
const formatHM = (decimalHours) => {
    const hoursFloat = parseFloat(decimalHours) || 0;
    if (hoursFloat === 0) return '0j 0m 0d';

    const h = Math.floor(hoursFloat);
    const m = Math.floor((hoursFloat - h) * 60);
    const s = Math.round((((hoursFloat - h) * 60) - m) * 60);

    return `${h}j ${m}m ${s}d`;
};

const estimasiBiaya = computed(() => luasHektar.value * tarifPerHa.value);
const selisihDrift = computed(() => Math.max(0, jarakMentahSensor.value - jarakBersihValid.value));

const resetArgo = async () => {
    const confirm = await Swal.fire({
        title: 'Reset Argo?',
        text: "Jarak kerja akan dikembalikan ke 0.",
        icon: 'warning', showCancelButton: true, confirmButtonText: 'Ya, Reset!'
    });

    if (confirm.isConfirmed) {
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/alsintan/${id}/reset`);
            jarakMentahSensor.value = 0;
            jarakBersihValid.value = 0;
            historyCoordsLive.value = [];
            if (activeTab.value === 'LIVE') renderPolyline();
            Swal.fire('Sesi Baru Dimulai!', '', 'success');
        } catch (error) {}
    }
};

watch(activeTab, (newTab) => {
    if (newTab === 'HISTORY') fetchHistoryByDate();
    else renderPolyline(); 
});

watch(historyDate, () => {
    if (activeTab.value === 'HISTORY') fetchHistoryByDate();
});

onMounted(() => {
    const session = JSON.parse(sessionStorage.getItem('user'));
    if (session) userRole.value = session.role;
    
    fetchTarif();
    fetchData();
    connectMqtt(); 
    syncTimer = setInterval(fetchCleanDataOnly, 10000);
});

onUnmounted(() => { 
    if (mqttClient) mqttClient.end(); 
    if (syncTimer) clearInterval(syncTimer);
    if (offlineTimer) clearTimeout(offlineTimer);
});
</script>

<template>
  <div class="container-fluid d-flex flex-column pb-1" style="height: calc(100vh - 4.5rem);">
    
    <div class="d-flex justify-content-between align-items-center mb-2">
      <div>
        <h4 class="fw-bold mb-0">📡 Dashboard Kendali: {{ infoAlat.nama_alat }}</h4>
        <div class="d-flex align-items-center mt-1 gap-2">
            <span class="badge border border-secondary text-secondary">{{ infoAlat.kode_perangkat }}</span>
            <span class="badge" :class="statusIot === 'ON' ? 'bg-success' : 'bg-danger text-white'">
                <i class="bi bi-broadcast"></i> IoT: {{ statusIot === 'ON' ? 'ONLINE' : 'OFFLINE' }}
            </span>
            <span class="badge" :class="getTractorClass(statusMesin)">
              <i class="bi bi-truck"></i> MESIN: {{ statusMesin }}
            </span>
        </div>
      </div>
      <button @click="router.back()" class="btn btn-outline-secondary btn-sm shadow-sm">
          <i class="bi bi-arrow-left"></i> Kembali ke Radar
      </button>
    </div>

    <div class="row g-3 flex-grow-1 overflow-hidden pb-2">
      <div class="col-lg-8 h-100">
        <div class="card shadow-sm border-0 h-100 position-relative overflow-hidden">
          
          <div class="position-absolute top-0 start-50 translate-middle-x mt-3 z-3 bg-white shadow-sm p-1 d-flex gap-1 border">
              <button class="btn btn-sm rounded-pill fw-bold" 
                      style="min-width: 150px; padding-block: 8px;"
                      :class="activeTab === 'LIVE' ? 'btn-primary' : 'btn-light text-muted'"
                      @click="activeTab = 'LIVE'"><i class="bi bi-broadcast"></i> Live Mode</button>
              <button class="btn btn-sm rounded-pill fw-bold" 
                      style="min-width: 150px; padding-block: 8px;"
                      :class="activeTab === 'HISTORY' ? 'btn-danger' : 'btn-light text-muted'"
                      @click="activeTab = 'HISTORY'"><i class="bi bi-clock-history"></i> Riwayat Lintasan</button>
          </div>

          <div v-if="activeTab === 'LIVE' && statusMesin === 'OFF'" 
               class="position-absolute bottom-0 start-0 w-100 bg-dark bg-opacity-75 text-white text-center p-2 z-3"
               style="font-size: 12px;">
               <i class="bi bi-info-circle text-warning"></i> Traktor sedang parkir (Mesin Mati). Argo jarak dihentikan sementara.
          </div>
          <div v-if="activeTab === 'LIVE' && statusMesin === 'UNKNOWN'" 
               class="position-absolute bottom-0 start-0 w-100 bg-danger bg-opacity-75 text-white text-center p-2 z-3"
               style="font-size: 12px;">
               <i class="bi bi-exclamation-triangle-fill text-warning"></i> Kehilangan sinyal IoT (>10 Menit). Menunggu data masuk...
          </div>
          
          <div id="monitor-map" style="height: 100%; width: 100%;"></div>
        </div>
      </div>

      <div class="col-lg-4 h-100">
        <div class="card border-0 shadow-sm h-100 d-flex flex-column">
          <div class="card-header py-3" :class="activeTab === 'LIVE' ? 'bg-primary text-white' : 'bg-danger text-white'">
             <h6 class="mb-0 fw-bold text-center">
                 <i class="bi" :class="activeTab === 'LIVE' ? 'bi-cpu-fill' : 'bi-receipt'"></i> 
                 {{ activeTab === 'LIVE' ? 'PANEL TELEMETRI LIVE' : 'PEMBUKUAN & ESTIMASI' }}
             </h6>
          </div>
          
          <div class="card-body bg-light d-flex flex-column gap-3 overflow-auto custom-scrollbar">
            
            <div v-if="activeTab === 'HISTORY'" class="bg-white p-3 rounded border shadow-sm flex-shrink-0">
                <label class="small fw-bold text-muted mb-1">Pilih Tanggal Operasi:</label>
                <input type="date" v-model="historyDate" class="form-control">
            </div>

            <div class="card border-0 shadow-sm bg-white flex-grow-1 d-flex flex-column justify-content-center">
              <div class="card-body text-center d-flex flex-column justify-content-center">
                <span class="text-muted small text-uppercase fw-bold">Estimasi Luas Tergarap</span>
                <h2 class="display-4 fw-bold my-2" :class="activeTab === 'LIVE' ? 'text-primary' : 'text-danger'">
                  {{ luasHektar.toFixed(3) }} <span class="fs-6 text-muted">Ha</span>
                </h2>
                
                <div v-if="activeTab === 'LIVE'" class="border-top pt-2 mt-2 text-start">
                    <div class="d-flex justify-content-between small mb-1">
                        <span class="text-muted">Jarak Terekam (Map):</span><span class="fw-bold">{{ (jarakMentahSensor / 1000).toFixed(2) }} km</span>
                    </div>
                    <div class="d-flex justify-content-between small mb-1">
                        <span class="text-muted">Jarak Bersih (Sistem):</span><span class="fw-bold text-success">{{ (jarakBersihValid / 1000).toFixed(2) }} km</span>
                    </div>
                    <div class="d-flex justify-content-between small bg-danger bg-opacity-10 px-2 py-1 rounded mt-2">
                        <span class="text-danger fw-bold"><i class="bi bi-funnel-fill"></i> GPS Drift Dibuang:</span>
                        <span class="text-danger fw-bold">{{ selisihDrift.toFixed(1) }} meter</span>
                    </div>
                </div>
                <small v-else class="text-muted border-top pt-2 d-block">Jarak Kerja Terpilih: {{ (totalJarakPast / 1000).toFixed(2) }} km</small>
              </div>
            </div>

            <div v-if="activeTab === 'LIVE'" class="d-flex justify-content-between px-2 small flex-shrink-0">
                <span class="text-muted fw-bold"><i class="bi bi-geo text-danger"></i> HDOP: <span :class="hdop > 250 ? 'text-danger' : 'text-success'">{{ (hdop / 100).toFixed(2) }}</span></span>
            </div>

            <div v-if="activeTab === 'LIVE'" class="row g-2 flex-shrink-0">
              <div class="col-4">
                  <div class="card border-0 shadow-sm bg-white h-100">
                      <div class="card-body text-center p-2">
                          <small class="text-muted d-block mb-1">HM Total</small>
                          <h5 class="fw-bold mb-0 text-dark" style="font-size: 1rem;">{{ formatHM(totalHM) }}</h5>
                      </div>
                  </div>
              </div>
              <div class="col-4">
                  <div class="card border-0 shadow-sm bg-white h-100">
                      <div class="card-body text-center p-2">
                          <small class="text-muted d-block mb-1">Voltase Aki</small>
                          <h5 class="fw-bold mb-0" :class="teganganAki < 11.5 ? 'text-danger' : 'text-success'">{{ teganganAki }} <small>V</small></h5>
                      </div>
                  </div>
              </div>
              <div class="col-4">
                  <div class="card border-0 shadow-sm bg-white h-100">
                      <div class="card-body text-center p-2">
                          <small class="text-muted d-block mb-1">Arus Beban</small>
                          <h5 class="fw-bold mb-0 text-info">{{ arus }} <small>mA</small></h5>
                      </div>
                  </div>
              </div>
            </div>

            <div v-if="activeTab === 'HISTORY'" class="row g-2 flex-shrink-0">
              <div class="col-6">
                  <div class="card border-0 shadow-sm bg-danger bg-opacity-10 border-danger h-100">
                      <div class="card-body text-center p-2">
                          <small class="text-danger fw-bold d-block mb-1">Kerja Harian (Efektif)</small>
                          <h5 class="fw-bold mb-0 text-danger" style="font-size: 1rem;">{{ formatHM(dailyHMPast) }}</h5>
                      </div>
                  </div>
              </div>
              <div class="col-6">
                  <div class="card border-0 shadow-sm bg-white h-100">
                      <div class="card-body text-center p-2">
                          <small class="text-muted d-block mb-1">Total HM Keseluruhan</small>
                          <h5 class="fw-bold mb-0 text-dark" style="font-size: 1rem;">{{ formatHM(totalHM) }}</h5>
                      </div>
                  </div>
              </div>
            </div>

            <div class="card border border-warning shadow-sm bg-warning bg-opacity-10 flex-shrink-0 mt-1">
              <div class="card-body">
                <label class="small text-muted fw-bold d-block mb-1">Tarif Jasa per Hektar</label>
                
                <div class="input-group input-group-sm mb-3 shadow-sm">
                    <span class="input-group-text bg-white">Rp</span>
                    <input type="number" v-model="tarifPerHa" class="form-control fw-bold border-start-0"
                           :disabled="!['super_admin'].includes(userRole)">
                    
                    <button v-if="['super_admin'].includes(userRole)" @click="saveTarif" 
                            class="btn btn-warning fw-bold px-2 border-warning z-0" 
                            :disabled="isSavingTarif" title="Simpan Tarif Global">
                        <span v-if="isSavingTarif" class="spinner-border spinner-border-sm"></span>
                        <i v-else class="bi bi-check-lg"></i>
                    </button>
                </div>
                
                <div class="d-flex justify-content-between align-items-center border-top border-warning pt-2">
                  <span class="fw-bold text-warning-emphasis">Total Tagihan</span>
                  <span class="h5 mb-0 fw-bold text-dark">Rp {{ Math.round(estimasiBiaya).toLocaleString('id-ID') }}</span>
                </div>
              </div>
            </div>
            
            <button v-if="activeTab === 'LIVE'" @click="resetArgo" class="btn btn-dark w-100 shadow-sm py-2 flex-shrink-0 mt-2"><i class="bi bi-arrow-repeat"></i> Reset Argo</button>
          </div>
        </div>
      </div>
    </div>

    <div class="text-center mt-2 text-muted flex-shrink-0" style="font-size: 0.75rem; letter-spacing: 0.5px;">
        &copy; 2026 Balai Pengembangan Mekanisasi Pertanian - Pemprov Jawa Barat. Versi 1.1.0
    </div>

  </div>
</template>

<style scoped>
.animate-pulse { animation: pulse 1s infinite; }
@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
.z-3 { z-index: 1000 !important; }

/* Kustomisasi Scrollbar jika layar terlalu kecil */
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #dee2e6; border-radius: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #adb5bd; }
</style>