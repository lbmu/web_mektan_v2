<script setup>
import {ref, onMounted, onUnmounted, nextTick, watch} from 'vue';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const alsintan = ref(null);     //Data Mesin
const loading = ref(true);      //Status Loading
const selectedId = ref(1);     //ID Alat Terpilih
let polling = null;            //Timer Update
let map = null;                //Objek Peta
let marker = null;             //Objek Marker Peta

//Inisialisasi Peta Leaflet
const initMap = () => {
    if (map) return;
    
    map = L.map('mapContainer').setView([-6.9175, 107.6191], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);
};

//Perbarui Posisi Marker pada Peta
const updateMapPosition = (lat, lng) => {
    if (!map) return;
    const posisi = [lat, lng];
    if (!marker){
        marker = L.marker(posisi).addTo(map);
    } else {
        marker.setLatLng(posisi);
    }
    map.setView(posisi, 15);
};

//Ambil Data dari API
const fetchData = async () => {
    try {
        const response = await axios.get('http://localhost:3000/api/monitoring/status/1')
        alsintan.value = response.data;
        
        if (!map) {
        // if (loading.value) {
        //     loading.value = false;
            await nextTick();
            initMap();
        }

        if (alsintan.value.latitude && alsintan.value.longitude) {
            updateMapPosition(alsintan.value.latitude, alsintan.value.longitude);
        }

    } catch (error) {
        console.error("Gagal mengambil data:", error);
        loading.value = false;

    }
};

//Watcher untuk perubahan selectedId
watch(selectedId, () => {
   alsintan.value = null;
    loading.value = true;
    fetchData().then(() => {
        loading.value = false;
    });
});


//Lifecycle Halaman Dibuka
onMounted(async () => {
    fetchData();
    polling = setInterval(fetchData, 2000); //Perbarui setiap 2 detik
});

//Lifecycle Halaman Ditutup
onMounted(() => {
    clearInterval(polling);
    if (map) {
        map.remove();
        map = null;
    }
});
</script>

<template>
    <div class="container-fluid">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2 class="fw-bold text-dark mb-0">🌍 Monitoring Aktivitas</h2>

            <div class="d-flex align-items-center">
                <label class="me-2 fw-bold">Pilih Alat:</label>
                <select v-model="selectedId" class="form-select" style="width: 200px;">
                    <option :value="1">Traktor Roda 4</option>
                    <option :value="2">Combine Harvester</option>
                    </select>
                </div>
            </div>

            <div v-if="!alsintan && loading" class="text-center mt-5">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-2 text-muted">Mencari sinyal GPS...</p>
            </div>

            <div v-else class="row">

            <div class="col-md-4 mb-3">
                <div class="card card-modern bg-white h-100">
                    <div class="card-header bg-primary text-white">
                        <h5 class="card-title mb-0">Status Operasional</h5>
                    </div>
                    <div class="card-body" v-if="alsintan">
                        <h3 class="fw-bold">{{ alsintan.nama_alat }}</h3>
            
                        <p class="text-muted mb-4">
                            <i class="bi bi-tag-fill"></i> {{ alsintan.kategori_alat }} <br>
                            <i class="bi bi-award-fill"></i> {{ alsintan.merk_alat }}
                        </p>

                        <hr>

                        <div class="mb-3">
                            <label class="small text-muted">Kondisi Mesin:</label>
                            <div class="d-grid">
                                <button class="btn btn-lg fw-bold" :class="alsintan.status_mesin === 'ON' ? 'btn-success' : 'btn-danger'">
                                    MESIN {{ alsintan.status_mesin }}
                                </button>
                            </div>
                        </div>

                        <div class="alert alert-light border">
                            <small>
                                <strong>Latitude:</strong> {{ alsintan.latitude }} <br>
                                <strong>Longitude:</strong> {{ alsintan.longitude }}
                            </small>
                        </div>
            
                        <p class="text-muted small mt-2">
                            Update Terakhir: {{ new Date(alsintan.updated_at).toLocaleTimeString() }}
                        </p>
                    </div>

                    <div class="card-body text-center" v-else>
                        <p class="text-danger">Data alat ID {{ selectedId }} tidak ditemukan.<br>Pastikan alat sudah didaftarkan.</p>
                    </div>
                </div>
            </div>

            <div class="col-md-8 mb-3">
                <div class="card card-modern bg-white h-100">
                    <div class="card-body p-0 position-relative">
                        <div id="mapContainer" class="map-responsive" style="height: 500px; border-radius: 0 12px 12px 0;"></div>
            
                        <div class="position-absolute top-0 end-0 m-3 p-2 bg-white rounded shadow" style="z-index: 999;">
                            <small class="fw-bold">📍 Lokasi Real-time</small>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
</template>