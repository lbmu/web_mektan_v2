<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import axios from 'axios';
import Swal from 'sweetalert2';
import mqtt from 'mqtt';

const MQTT_HOST = import.meta.env.VITE_MQTT_HOST;
const MQTT_PORT = Number(import.meta.env.VITE_MQTT_PORT);
const MQTT_TOPIC = import.meta.env.VITE_MQTT_TOPIC;
const MQTT_USERNAME = import.meta.env.VITE_MQTT_USERNAME;
const MQTT_PASSWORD = import.meta.env.VITE_MQTT_PASSWORD;

const items = ref([]);
const loading = ref(true);
const isCalculating = ref(false); 
const userRole = ref('');

const isSavingTarif = ref(false); 
const tarifPerHa = ref(1500000);

const displayTarif = computed({
    get: () => {
        if (!tarifPerHa.value) return '0';
        return Number(tarifPerHa.value).toLocaleString('id-ID');
    },
    set: (val) => {
        const numericString = val.replace(/\D/g, '');
        tarifPerHa.value = Number(numericString);
    }
});

const dailyStats = ref({});
const lastMqttData = ref({}); 
let mqttClient = null;

const getTodayDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const selectedDate = ref(getTodayDate());

// --- ALGORITMA HAVERSINE ---
const hitungJarakHaversine = (lat1, lon1, lat2, lon2) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371000; 
    
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
};

const fetchAndCalculateHistory = async (item) => {
    try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/alsintan/${item.alsintan_id}/riwayat?tanggal=${selectedDate.value}`);
        const rawData = response.data;

        let dailyHM = 0;
        let dailyDistance = 0;

        if (rawData.length > 1) {
            for (let i = 1; i < rawData.length; i++) {
                if (rawData[i-1].status_mesin === 'ON') {
                    const t1 = new Date(rawData[i-1].waktu_rekam).getTime();
                    const t2 = new Date(rawData[i].waktu_rekam).getTime();
                    const diffMs = t2 - t1;
                    if (diffMs > 0) dailyHM += diffMs / 3600000; 
                }
            }
        }

        const validCoords = rawData.filter(h => Math.abs(parseFloat(h.latitude)) > 1 && Math.abs(parseFloat(h.longitude)) > 1);

        if (validCoords.length > 1) {
            for (let i = 1; i < validCoords.length; i++) {
                if (validCoords[i-1].status_mesin === 'ON') {
                    const lat1 = parseFloat(validCoords[i-1].latitude);
                    const lon1 = parseFloat(validCoords[i-1].longitude);
                    const lat2 = parseFloat(validCoords[i].latitude);
                    const lon2 = parseFloat(validCoords[i].longitude);
                    dailyDistance += hitungJarakHaversine(lat1, lon1, lat2, lon2);
                }
            }
        }

        dailyStats.value[item.alsintan_id] = { hm: dailyHM, distance: dailyDistance };

    } catch (error) {
        dailyStats.value[item.alsintan_id] = { hm: 0, distance: 0 };
    }
};

const calculateAllEstimations = async () => {
    isCalculating.value = true;
    try {
        await Promise.all(items.value.map(item => fetchAndCalculateHistory(item)));
    } catch (error) {
        console.error("Gagal menghitung estimasi massal:", error);
    } finally {
        isCalculating.value = false;
    }
};

const connectMqtt = () => {
    const options = { host: MQTT_HOST, port: MQTT_PORT, protocol: 'wss', path: '/mqtt', username: MQTT_USERNAME, password: MQTT_PASSWORD };
    mqttClient = mqtt.connect(options);
    
    mqttClient.on('connect', () => { mqttClient.subscribe(MQTT_TOPIC); });

    mqttClient.on('message', (topic, message) => {
        if (selectedDate.value !== getTodayDate()) return;

        try {
            const data = JSON.parse(message.toString());
            const id = data.id;
            
            if (!dailyStats.value[id]) return;

            const vAki = parseFloat(data.V) || 0;
            const lat = parseFloat(data.lat);
            const lng = parseFloat(data.lng);
            const currentTime = Date.now();
            
            const isMesinOn = vAki > 13.4;
            const isGpsValid = lat && lng && !isNaN(lat) && !isNaN(lng) && Math.abs(lat) > 1 && Math.abs(lng) > 1;

            if (!lastMqttData.value[id]) {
                lastMqttData.value[id] = { time: currentTime, lat: lat, lng: lng, status: isMesinOn ? 'ON' : 'OFF' };
                return; 
            }

            const prev = lastMqttData.value[id];

            if (prev.status === 'ON') {
                const diffMs = currentTime - prev.time;
                if (diffMs > 0 && diffMs <= 60000) { 
                    dailyStats.value[id].hm += (diffMs / 3600000);
                }

                if (isGpsValid && prev.lat && prev.lng) {
                    const dist = hitungJarakHaversine(prev.lat, prev.lng, lat, lng);
                    if (dist > 0.5 && dist < 50) {
                        dailyStats.value[id].distance += dist;
                    }
                }
            }

            lastMqttData.value[id] = {
                time: currentTime,
                lat: isGpsValid ? lat : prev.lat, 
                lng: isGpsValid ? lng : prev.lng,
                status: isMesinOn ? 'ON' : 'OFF'
            };

        } catch (err) {}
    });
};

const fetchData = async () => {
    loading.value = true;
    try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/alsintan`);
        items.value = response.data;
        await calculateAllEstimations(); 
    } catch (error) {
        console.error("Gagal ambil data armada:", error);
    } finally {
        loading.value = false;
    }
};

const fetchTarif = async () => {
    try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/settings/tarif`);
        tarifPerHa.value = Number(res.data.nilai);
    } catch (e) {}
};

const saveTarif = async () => {
    isSavingTarif.value = true;
    try {
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/settings/tarif`, { nilai: tarifPerHa.value });
        Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Tarif dasar telah diperbarui.', confirmButtonColor: '#198754' });
    } catch (e) {
        Swal.fire('Error', 'Gagal menyimpan perubahan tarif', 'error');
    } finally {
        isSavingTarif.value = false;
    }
};

const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
};

const formatHM = (decimalHours) => {
    const hoursFloat = parseFloat(decimalHours) || 0;
    if (hoursFloat === 0) return '0 Jam 0 Menit';

    const h = Math.floor(hoursFloat);
    const m = Math.floor((hoursFloat - h) * 60);
    const s = Math.round((((hoursFloat - h) * 60) - m) * 60);

    if (h > 0) return `${h} Jam ${m} Menit`;
    return `${m} Menit ${s} Detik`; 
};

const hitungLuas = (item) => {
    const stats = dailyStats.value[item.alsintan_id];
    if (!stats) return 0;
    
    const jarakMeter = parseFloat(stats.distance) || 0;
    const lebar = parseFloat(item.lebar_implemen) || 1.89; 
    
    return (jarakMeter * lebar) / 10000; 
};

const totalOmzetSemuaAlat = computed(() => {
    return items.value.reduce((total, item) => {
        const luas = hitungLuas(item);
        return total + (luas * tarifPerHa.value);
    }, 0);
});

watch(selectedDate, () => {
    if (items.value.length > 0) {
        lastMqttData.value = {}; 
        calculateAllEstimations();
    }
});

onMounted(() => {
    const session = JSON.parse(sessionStorage.getItem('user'));
    if (session) userRole.value = session.role;
    fetchTarif(); 
    fetchData();
    connectMqtt(); 
});

onUnmounted(() => {
    if (mqttClient) mqttClient.end(); 
});
</script>

<template>
  <div class="container-fluid d-flex flex-column pb-2" style="min-height: calc(100vh - 5rem);">
    
    <div class="flex-grow-1">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h3 class="fw-bold text-dark mb-1">📘 Buku Besar & Estimasi Biaya</h3>
                <div class="d-flex align-items-center gap-2">
                    <span class="text-muted small">Filter Rekapitulasi Tanggal: </span>
                    <input type="date" v-model="selectedDate" class="form-control form-control-sm border-primary text-primary fw-bold" style="width: auto;">
                    
                </div>
            </div>
            
            <div class="card bg-success text-white border-0 shadow-sm" style="min-width: 250px;">
                <div class="card-body py-2 px-3 text-end">
                    <small class="d-block text-white-50 text-uppercase fw-bold">Total Akumulasi Harian</small>
                    <h3 class="fw-bold mb-0">
                        <span v-if="isCalculating" class="spinner-border spinner-border-sm me-2"></span>
                        {{ formatRupiah(totalOmzetSemuaAlat) }}
                    </h3>
                </div>
            </div>
        </div>

        <div class="row g-4">
            <div class="col-md-4">
                <div class="card border-0 shadow-sm h-100 bg-white">
                    <div class="card-header bg-transparent border-bottom-0 pt-4 pb-0">
                        <h6 class="fw-bold">⚙️ Pengaturan Tarif</h6>
                    </div>
                    <div class="card-body">
                        <label class="form-label text-muted small">Harga Jasa per Hektar</label>
                        
                        <div class="input-group mb-3 shadow-sm rounded overflow-hidden" style="border: 1px solid #ced4da;">
                            
                            <!-- Bagian Rp -->
                            <span class="input-group-text bg-white border-0 text-muted fw-bold pe-2">Rp</span>
                            
                            <!-- [DIPERBARUI] Bagian Input Terbuka hanya untuk UPJA -->
                            <input v-model="displayTarif" type="text" 
                                class="form-control fw-bold border-0 text-end text-primary"
                                style="font-size: 1.15rem; box-shadow: none;"
                                :disabled="userRole !== 'upja'">
                                
                            <!-- [DIPERBARUI] Bagian Tombol Muncul hanya untuk UPJA -->
                            <button v-if="userRole === 'upja'" @click="saveTarif" 
                                    class="btn btn-primary fw-bold px-4 border-0 z-0" :disabled="isSavingTarif">
                                <span v-if="isSavingTarif" class="spinner-border spinner-border-sm me-1"></span>
                                <i v-else class="bi bi-floppy-fill me-1"></i> Simpan
                            </button>
                            
                        </div>
                        
                        <!-- [DIPERBARUI] Notifikasi Peringatan Akses -->
                        <div v-if="userRole !== 'upja'" class="alert alert-warning py-2 small mb-0 mt-2">
                            <i class="bi bi-lock-fill"></i> Hak akses tarif sewa dikelola sepenuhnya oleh pihak <b>UPJA</b>.
                        </div>
                        <small v-else class="text-muted mt-2 d-block" style="font-size:11px;">
                            <i class="bi bi-info-circle"></i> Tentukan harga sewa per hektar yang berlaku untuk kelompok tani Anda.
                        </small>
                    </div>
                </div>
            </div>

            <div class="col-md-8">
                <div class="card border-0 shadow-sm h-100 position-relative overflow-hidden">
                    
                    <div v-if="isCalculating" class="position-absolute w-100 h-100 bg-white bg-opacity-75 d-flex justify-content-center align-items-center" style="z-index: 10;">
                        <div class="text-center">
                            <div class="spinner-border text-primary mb-2" role="status"></div>
                            <h6 class="text-primary fw-bold">Menghitung Data Riwayat...</h6>
                        </div>
                    </div>

                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover align-middle mb-0">
                                <thead class="bg-light">
                                    <tr>
                                        <th class="ps-4">Nama Aset Alsintan</th>
                                        <th class="text-center">Jam Kerja</th>
                                        <th class="text-center">Luas Tergarap</th>
                                        <th class="text-end pe-4">Biaya Sewa Alsintan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="item in items" :key="item.alsintan_id">
                                        <td class="ps-4">
                                            <div class="fw-bold text-dark">{{ item.nama_alat }}</div>
                                            <span class="badge bg-secondary text-white fw-normal" style="font-size: 10px;">{{ item.kode_perangkat }}</span>
                                        </td>
                                        
                                        <td class="text-center">
                                            <span class="fw-bold text-dark">
                                                {{ formatHM(dailyStats[item.alsintan_id]?.hm || 0) }}
                                            </span>
                                        </td>
                                        
                                        <td class="text-center align-middle">
                                            <div class="fw-bold text-primary" style="font-size: 18px; line-height: 1; margin-bottom: 4px;">
                                                {{ hitungLuas(item).toFixed(3) }} Ha
                                            </div>
                                            <small class="text-muted d-block" style="font-size: 11px; line-height: 1;">
                                                ({{ (dailyStats[item.alsintan_id]?.distance || 0).toFixed(0) }} meter)
                                            </small>
                                        </td>

                                        <td class="text-end pe-4 fw-bold text-success fs-6">
                                            {{ formatRupiah(hitungLuas(item) * tarifPerHa) }}
                                        </td>
                                    </tr>
                                    
                                    <tr v-if="items.length === 0">
                                        <td colspan="4" class="text-center py-5 text-muted">Belum ada armada yang terdaftar.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="text-center mt-5 pt-3 border-top text-muted" style="font-size: 0.75rem; letter-spacing: 0.5px;">
        &copy; 2026 Balai Pengembangan Mekanisasi Pertanian - Pemprov Jawa Barat. Versi 1.1.0
    </div>

  </div>
</template>

<style scoped>
.animate-pulse { animation: pulse 1.5s infinite; }
@keyframes pulse {
  0% { opacity: 1; box-shadow: 0 0 0 0 rgba(25, 135, 84, 0.7); }
  70% { opacity: 0.8; box-shadow: 0 0 0 6px rgba(25, 135, 84, 0); }
  100% { opacity: 1; box-shadow: 0 0 0 0 rgba(25, 135, 84, 0); }
}
</style>