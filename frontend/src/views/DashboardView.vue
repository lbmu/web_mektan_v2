<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import mqtt from 'mqtt';

const MQTT_BROKER_URL = 'ws://broker.hivemq.com:8000/mqtt'; 
const MQTT_TOPIC = 'project-mektan/v1/data';

const items = ref([]);
const loading = ref(true);
let map = null;
let mqttClient = null;

const markers = {};

// 1. AMBIL DATA DARI BACKEND
const fetchData = async () => {
  try {
    const response = await axios.get('http://localhost:3000/api/alsintan');
    items.value = response.data;
  } catch (error) {
    console.error("Gagal ambil data:", error);
  } finally {
    loading.value = false;
    setTimeout(() => {
      initMap();     
      connectMqtt(); 
    }, 500); 
  }
};

const initMap = () => {
  const mapContainer = document.getElementById('main-map');
  if (!mapContainer) {
    console.error("Map container 'main-map' tidak ditemukan!");
    return;
  }

  // Hapus peta lama jika ada (untuk mencegah duplikasi saat refresh)
  if (map) {
    map.remove(); 
  }

  // Setup Peta
  // Koordinat Default: Telkom University (-6.974, 107.630)
  map = L.map('main-map').setView([-6.974001, 107.630001], 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  items.value.forEach(item => {
    updateMarker(item.alsintan_id, item.nama_alat, item.latitude, item.longitude, item.status);
  });
};

const updateMarker = (id, nama, lat, long, status) => {
  if (!lat || !long) return;
  const newLat = parseFloat(lat);
  const newLong = parseFloat(long);

  // Cek apakah marker untuk alat ini sudah ada di peta?
  if (markers[id]) {
    // JIKA SUDAH ADA: Update posisinya (GESER MARKER)
    markers[id].setLatLng([newLat, newLong]);
    
    // Update isi popup juga (opsional, agar koordinat di teks berubah)
    const popupContent = generatePopupContent(nama, status, newLat, newLong, id);
    markers[id].getPopup().setContent(popupContent);
    
  } else {
    // JIKA BELUM ADA: Buat marker baru
    const newMarker = L.marker([newLat, newLong]).addTo(map);
    newMarker.bindPopup(generatePopupContent(nama, status, newLat, newLong, id));
    
    // Simpan ke memory agar nanti bisa diupdate
    markers[id] = newMarker;
  }
};

const generatePopupContent = (nama, status, lat, long, id) => {
  return `
    <div style="text-align:center; min-width: 120px;">
      <b style="font-size:14px; display:block; margin-bottom:4px;">${nama}</b>
      
      <span class="badge ${status === 'ON' ? 'bg-success' : 'bg-secondary'} mb-2">${status}</span><br>
      
      <div style="background:#f8f9fa; padding:4px; border-radius:4px; font-size:11px; margin-bottom:8px;" class="text-muted">
        Lat: ${lat.toFixed(5)}<br>
        Long: ${long.toFixed(5)}
      </div>

      <a href="/monitoring/${id}" 
         class="btn btn-sm btn-primary w-100 text-white text-decoration-none py-1"
         style="font-size: 12px;">
         📡 Pantau Live
      </a>
      
      <div class="mt-1">
        <a href="/aset/${id}" class="text-muted" style="font-size:10px; text-decoration:none;">
           Detail Aset &rarr;
        </a>
      </div>
    </div>
  `;
};

const connectMqtt = () => {
  console.log("Menghubungkan ke broker MQTT...");
  mqttClient = mqtt.connect(MQTT_BROKER_URL);

  mqttClient.on('connect', () => {
    console.log("Terhubung ke broker MQTT.");
    mqttClient.subscribe(MQTT_TOPIC)
  });

  mqttClient.on('message', (topic, message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log("📍 Live Update:", data);

      // Cari nama alat dari data items yang sudah ada (biar popup ada namanya)
      const alat = items.value.find(i => i.alsintan_id == data.id_alat);
      const namaAlat = alat ? alat.nama_alat : `Alat #${data.id_alat}`;
      const statusAlat = alat ? alat.status : 'ON';

      // Perbarui marker di peta
      updateMarker(data.id_alat, namaAlat, data.lat, data.long, statusAlat);
    } catch (error) {
      console.error("Gagal memproses pesan MQTT:", error);
    }
  });
};


// 2. HITUNG STATISTIK (COMPUTED)
const totalAset = computed(() => items.value.length);

const asetAktif = computed(() => {
  return items.value.filter(item => item.status === 'ON').length;
});

const asetMaintenance = computed(() => {
  return items.value.filter(item => 
    ['Maintenance', 'Rusak'].includes(item.status_operasional)
  ).length;
});

const sensorAlert = computed(() => {
  return items.value.filter(item => item.status_sensor !== 'Normal').length;
});

onMounted(() => {
  fetchData();
});

onUnmounted(() => {
  if (mqttClient) mqttClient.end();
});
</script>

<template>
  <div class="container-fluid">
    
    <div class="mb-4">
      <h2 class="fw-bold text-dark">📊 Dashboard Utama</h2>
      <p class="text-muted">Ringkasan status alat mesin pertanian (Alsintan) Anda.</p>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <div v-else>
      
      <div class="row g-3 mb-4">
        
        <div class="col-md-3 col-sm-6">
          <div class="card border-0 shadow-sm h-100 bg-primary text-white">
            <div class="card-body">
              <div class="d-flex align-items-center mb-2">
                <i class="bi bi-grid-fill fs-4 me-2"></i>
                <h6 class="card-title mb-0">Total Aset</h6>
              </div>
              <h2 class="fw-bold mb-0">{{ totalAset }} <small class="fs-6 fw-normal">Unit</small></h2>
            </div>
          </div>
        </div>

        <div class="col-md-3 col-sm-6">
          <div class="card border-0 shadow-sm h-100 bg-success text-white">
            <div class="card-body">
              <div class="d-flex align-items-center mb-2">
                <i class="bi bi-power fs-4 me-2"></i>
                <h6 class="card-title mb-0">Sedang Aktif</h6>
              </div>
              <h2 class="fw-bold mb-0">{{ asetAktif }} <small class="fs-6 fw-normal">Unit</small></h2>
            </div>
          </div>
        </div>

        <div class="col-md-3 col-sm-6">
          <div class="card border-0 shadow-sm h-100 bg-warning text-dark">
            <div class="card-body">
              <div class="d-flex align-items-center mb-2">
                <i class="bi bi-wrench-adjustable fs-4 me-2"></i>
                <h6 class="card-title mb-0">Maintenance</h6>
              </div>
              <h2 class="fw-bold mb-0">{{ asetMaintenance }} <small class="fs-6 fw-normal">Unit</small></h2>
            </div>
          </div>
        </div>

        <div class="col-md-3 col-sm-6">
          <div class="card border-0 shadow-sm h-100 bg-danger text-white">
            <div class="card-body">
              <div class="d-flex align-items-center mb-2">
                <i class="bi bi-exclamation-triangle-fill fs-4 me-2"></i>
                <h6 class="card-title mb-0">Sensor Alert</h6>
              </div>
              <h2 class="fw-bold mb-0">{{ sensorAlert }} <small class="fs-6 fw-normal">Isu</small></h2>
            </div>
          </div>
        </div>

      </div>

      <div class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <h6 class="fw-bold m-0 text-primary">🗺️ Live Tracking Map</h6>
          <span class="badge bg-danger animate-pulse">● LIVE</span>
        </div>
        <div class="card-body p-0">
          <div id="main-map" style="height: 400px; width: 100%;"></div>
        </div>
      </div>

      <div class="card border-0 shadow-sm">
        <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <h6 class="fw-bold m-0 text-primary">🕒 Aktivitas Terbaru</h6>
          <RouterLink to="/aset" class="btn btn-sm btn-outline-primary">Lihat Semua</RouterLink>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="bg-light">
                <tr>
                  <th class="ps-4">Nama Alat</th>
                  <th>Lokasi (Lat, Long)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in items.slice(0, 5)" :key="item.alsintan_id">
                  <td class="ps-4 fw-bold">{{ item.nama_alat }}</td>
                  <td>
                    <span v-if="item.latitude">
                      {{ item.latitude }}, {{ item.longitude }}
                    </span>
                    <span v-else class="text-muted fst-italic">Belum ada lokasi</span>
                  </td>
                  <td>
                    <span class="badge" 
                      :class="item.status === 'ON' ? 'bg-success' : 'bg-secondary'">
                      {{ item.status }}
                    </span>
                  </td>
                  <td class="text-muted small">
                    {{ new Date(item.created_at).toLocaleDateString('id-ID') }}
                  </td>
                </tr>
                <tr v-if="items.length === 0">
                  <td colspan="3" class="text-center py-4 text-muted">Belum ada data.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
#main-map { z-index: 1; }
/* Animasi kedip untuk badge LIVE */
@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}
.animate-pulse {
  animation: pulse 2s infinite;
}
</style>