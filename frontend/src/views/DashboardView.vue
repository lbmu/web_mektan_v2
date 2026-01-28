<script setup>
    import {ref, onMounted, onUnmounted, nextTick} from 'vue';
    import axios from 'axios';
    import L from 'leaflet';

    const alsintan = ref(null);
    const loading = ref(true);
    let polling = null;

    let map = null;
    let marker = null;

    const initMap = () => {
        if (map) return;
        
        map = L.map('mapContainer').setView([-6.9175, 107.6191], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(map);
    };

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

    const fetchData = async () => {
        try {
            const response = await axios.get('http://localhost:3000/api/iot/status/1')
            alsintan.value = response.data;
            
            if (loading.value) {
                loading.value = false;

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

    onMounted(async () => {
        fetchData();

        polling = setInterval(fetchData, 2000);
    });

    onUnmounted(() => {
        clearInterval(polling);
        if (map) {
            map.remove();
            map = null;
        }
    });
</script>

<template>
    <div class="container mt-5">
        <h2 class="mb-4 text-center">🚜 Dashboard Monitoring Alsintan</h2>

        <div v-if="loading" class="text-center mt-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Menghubungkan ke satelit...</p>
        </div>

        <div v-else class="row">

            <div class="col-md-5 mb-3">
                <div class="card shadow h-100">
                    <div class="card-header bg-primary text-white">
                        <h5 class="card-title mb-0">Informasi Alat</h5>
                    </div>
                    <div class="card-body" v-if="alsintan">
                        <h3>{{ alsintan.nama_alat }}</h3>
                        <p class="text-muted">{{ alsintan.jenis_alat }}</p>
                        <hr>
            
                        <h5>Status Mesin:</h5>
                        <span class="badge fs-4" :class="alsintan.status_mesin === 'ON' ? 'bg-success' : 'bg-danger'">{{ alsintan.status_mesin }}</span>
            
                        <p class="mt-3 text-muted small">
                            Update Terakhir:<br> 
                            {{ new Date(alsintan.updated_at).toLocaleString() }}
                        </p>
                    </div>
                    <div class="card-body text-center text-danger" v-else>
                        Data alat tidak ditemukan.
                    </div>
                </div>
            </div>

            <div class="col-md-7 mb-3">
                <div class="card shadow h-100">
                    <div class="card-header bg-success text-white">
                        <h5 class="card-title mb-0">Lokasi GPS Real-time</h5>
                    </div>
                <div class="card-body p-0"> <div id="mapContainer" style="height: 400px; width: 100%;"></div>

                    <div class="p-2 bg-light border-top" v-if="alsintan">
                        <small>
                            <strong>Lat:</strong> {{ alsintan.latitude }}, 
                            <strong>Lng:</strong> {{ alsintan.longitude }}
                        </small>
                    </div>

                </div>
            </div>
        </div>

    </div>
</div>
</template>

<style>
    @import "leaflet/dist/leaflet.css";
</style>