<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import Swal from 'sweetalert2';

// TANGKAP KREDENSIAL BRANKAS
const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL;
const MQTT_HOST = import.meta.env.VITE_MQTT_HOST;
const MQTT_PORT = Number(import.meta.env.VITE_MQTT_PORT);
const MQTT_TOPIC = import.meta.env.VITE_MQTT_TOPIC;
const MQTT_USERNAME = import.meta.env.VITE_MQTT_USERNAME;
const MQTT_PASSWORD = import.meta.env.VITE_MQTT_PASSWORD;

const router = useRouter();
const items = ref([]);
const loading = ref(true);
const userRole = ref('');

// State MQTT Client
let mqttClient = null;

// --- AMBIL DATA DARI DATABASE ---
const fetchData = async () => {
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/alsintan`);
    items.value = response.data;
  } catch (error) {
    console.error("Gagal mengambil data:", error);
  } finally {
    loading.value = false;
  }
};

// --- HELPER FUNGSI UNTUK TAMPILAN STATUS ---
const getTractorClass = (status) => {
  if (status === 'ON') return 'bg-success text-white animate-pulse';
  if (status === 'OFF') return 'bg-dark text-white-50';
  return 'bg-secondary text-white'; // Untuk UNKNOWN
};

const getTractorIcon = (status) => {
  if (status === 'ON') return 'bi-power';
  if (status === 'OFF') return 'bi-pause-circle';
  return 'bi-question-circle'; // Untuk UNKNOWN
};

// --- LOGIKA MQTT REAL-TIME ---
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
        console.log("📡 Connected to MQTT (Aset List - Dual Status)");
        mqttClient.subscribe(MQTT_TOPIC);
    });

    mqttClient.on('message', (topic, message) => {
        try {
            const data = JSON.parse(message.toString());
            
            const index = items.value.findIndex(i => i.alsintan_id == data.id);
            
            if (index !== -1) {
                const tegangan = parseFloat(data.V) || 0;
                const arus = parseFloat(data.I) || 0;
                
                // 1. UPDATE STATUS IOT & MESIN SECARA REAKTIF
                items.value[index].status_iot = 'ON'; 
                items.value[index].status_mesin = tegangan >= 13.0 ? 'ON' : 'OFF';

                // 2. UPDATE TELEMETRI & WAKTU
                items.value[index].tegangan_aki = tegangan; 
                items.value[index].arus = arus; 
                items.value[index].bbm = parseFloat(data.bbm) || 0;
                
                // Perbarui waktu last_heartbeat agar UI "Live" ikut terupdate
                items.value[index].last_heartbeat = new Date().toISOString();
            }
        } catch (err) {
            console.error("MQTT parsing error:", err);
        }
    });
};

// --- HAPUS (DENGAN ANIMASI SWEETALERT2) ---
const deleteItem = async (id) => {
  const result = await Swal.fire({
    title: 'Hapus data ini permanen?',
    text: "Semua riwayat perjalanan dan status IoT traktor ini akan ikut terhapus!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545', 
    cancelButtonColor: '#6c757d',  
    confirmButtonText: '<i class="bi bi-trash"></i> Ya, Hapus!',
    cancelButtonText: 'Batal',
    reverseButtons: true 
  });

  if (result.isConfirmed) {
    Swal.fire({
      title: 'Menghapus Aset...',
      text: 'Membersihkan data dari server.',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/alsintan/${id}`);
      fetchData(); 
      
      Swal.fire({
        icon: 'success',
        title: 'Terhapus!',
        text: 'Data aset dan gambar berhasil dibersihkan.',
        confirmButtonColor: '#198754'
      });
    } catch (error) {
      console.error("Gagal menghapus:", error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menghapus',
        text: 'Terjadi kesalahan pada server saat menghapus data.',
        confirmButtonColor: '#dc3545'
      });
    }
  }
};

const formatLastSeen = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

// --- NAVIGASI ---
const goToTambah = () => router.push({ name: 'aset-add' });
const goToDetail = (id) => router.push({ name: 'aset-detail', params: { id: id } }); 
const goToMonitoring = (id) => router.push({ name: 'monitoring-detail', params: { id: id } });

onMounted(() => {
    const session = JSON.parse(sessionStorage.getItem('user'));
    if (session) {
        userRole.value = session.role;
    }
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
            <h3 class="fw-bold text-dark mb-0">🚜 Daftar Aset Alsintan</h3>
            <p class="text-muted small">Manajemen data dan status armada.</p>
        </div>
        
        <button v-if="['super_admin'].includes(userRole)" @click="goToTambah" class="btn btn-primary shadow-sm">
            <i class="bi bi-plus-lg me-1"></i> Tambah Aset
        </button>
        </div>

        <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        </div>

        <div v-else class="card border-0 shadow-sm">
        <div class="card-body p-0">
            <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead class="bg-light">
                <tr>
                    <th class="ps-4">Alat & Kode</th>
                    <th>Status</th>
                    <th>Telemetri</th>
                    <th class="text-center pe-4">Status Admin</th>
                    <th class="text-center pe-4">Aksi</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="item in items" :key="item.alsintan_id">
                    <td class="ps-4">
                    <div class="d-flex align-items-center">
                        <img :src="item.gambar && item.gambar.startsWith('http') ? item.gambar : `${IMAGE_BASE_URL}/${item.gambar}`" 
                            class="rounded border object-fit-cover me-3" 
                            width="50" height="50" 
                            @error="$event.target.src='https://via.placeholder.com/50?text=IMG'">
                        <div>
                        <h6 class="mb-0 fw-bold text-dark">{{ item.nama_alat }}</h6>
                        <small class="text-muted badge bg-light text-dark border">{{ item.kode_perangkat }}</small>
                        </div>
                    </div>
                    </td>
                    
                    <td>
                    <div class="d-flex flex-column gap-1">
                        <div class="d-flex align-items-center gap-2">
                        <span class="small fw-bold text-muted" style="width: 35px; font-size: 11px;">IoT</span>
                        <span class="badge rounded-pill" 
                                :class="item.status_iot === 'ON' ? 'bg-success bg-opacity-10 text-success border border-success' : 'bg-danger bg-opacity-10 text-danger border border-danger'"
                                style="font-size: 10px;">
                            <i class="bi" :class="item.status_iot === 'ON' ? 'bi-broadcast' : 'bi-broadcast-pin'"></i>
                            {{ item.status_iot === 'ON' ? 'ONLINE' : 'OFFLINE' }}
                        </span>
                        </div>
                        
                        <div class="d-flex align-items-center gap-2">
                        <span class="small fw-bold text-muted" style="width: 35px; font-size: 11px;">Mesin</span>
                        <span class="badge rounded-pill px-2" 
                                :class="getTractorClass(item.status_mesin)"
                                style="font-size: 10px;">
                            <i class="bi" :class="getTractorIcon(item.status_mesin)"></i>
                            {{ item.status_mesin || 'UNKNOWN' }}
                        </span>
                        </div>

                        <div class="mt-1 small text-muted" style="font-size: 10px;">
                        <i class="bi bi-clock-history"></i> Last: {{ formatLastSeen(item.last_heartbeat) }}
                        </div>
                    </div>
                    </td>

                    <td>
                    <small class="d-block"><i class="bi bi-battery-charging text-warning"></i> {{ item.tegangan_aki || '0' }} V</small>
                    <small class="d-block"><i class="bi bi-lightning-charge-fill text-primary"></i> {{ item.arus || '0' }} mA</small>
                    </td>
                    <td class="text-center pe-4">
                    <span class="badge bg-light text-dark border">{{ item.status_operasional }}</span>
                    </td>
                    
                    <td class="text-center pe-4">
                    <div class="btn-group">
                        <button @click="goToDetail(item.alsintan_id)" class="btn btn-sm btn-outline-info" title="Detail Administrasi">
                        <i class="bi bi-info-circle"></i>
                        </button>
                        <button @click="goToMonitoring(item.alsintan_id)" class="btn btn-sm btn-outline-primary" title="Kendali Peta & Argo">
                        <i class="bi bi-geo-alt-fill"></i>
                        </button>

                        <button v-if="['super_admin'].includes(userRole)" @click="deleteItem(item.alsintan_id)" class="btn btn-sm btn-outline-danger" title="Hapus Permanen">
                        <i class="bi bi-trash"></i>
                        </button>
                    </div>
                    </td>

                </tr>
                </tbody>
            </table>
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
  70% { opacity: 1; box-shadow: 0 0 0 5px rgba(25, 135, 84, 0); }
  100% { opacity: 1; box-shadow: 0 0 0 0 rgba(25, 135, 84, 0); }
}
</style>