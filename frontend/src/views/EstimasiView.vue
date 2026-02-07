<script setup>

import { ref, onMounted, computed } from 'vue';
import axios from 'axios';

const items = ref([]);
const loading = ref(true);

const tarifPerHa = ref(1500000); // Tarif default per hektar

const fetchData = async () => {
    try {
        const response = await axios.get('http://localhost:3000/api/alsintan');
        items.value = response.data;
    } catch (error) {
        console.error("Gagal ambil data:", error);
    } finally {
    loading.value = false;
    }
};

const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { 
        style: 'currency', 
        currency: 'IDR', 
        minimumFractionDigits: 0
    }).format(angka);
};

const formatMeter = (nilai) => {
  const angka = parseFloat(nilai);
  if (isNaN(angka)) return '0';
  return angka.toFixed(0);
};

const hitungLuas = (jarakMeter) => {
    const m = parseFloat(jarakMeter) || 0;
    return m / 25; // Konversi meter ke hektar (1 ha = 2500 m2) 
};

const totalOmzetSemuaAlat = computed(() => {
    return items.value.reduce((total, item) => {
        const luas = hitungLuas(item.total_jarak_kerja);
        return total + (luas * tarifPerHa.value);
    }, 0);
});

onMounted(() => {
    fetchData();
});
</script>

<template>
  <div class="container-fluid">
    
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h3 class="fw-bold text-dark mb-0">💰 Laporan Estimasi & Pendapatan</h3>
        <p class="text-muted small">Rekapitulasi kinerja alat berdasarkan luasan lahan tergarap.</p>
      </div>
      
      <div class="card bg-primary text-white border-0 shadow-sm" style="min-width: 250px;">
        <div class="card-body py-2 px-3">
            <small class="d-block text-white-50">Total Potensi Pendapatan</small>
            <h4 class="fw-bold mb-0">{{ formatRupiah(totalOmzetSemuaAlat) }}</h4>
        </div>
      </div>
    </div>

    <div v-if="errorMessage" class="alert alert-danger">
        {{ errorMessage }}
    </div>

    <div class="row g-4">
        
        <div class="col-md-4">
            <div class="card border-0 shadow-sm h-100">
                <div class="card-header bg-white fw-bold py-3">⚙️ Pengaturan Tarif</div>
                <div class="card-body">
                    <label class="form-label">Harga Jasa per Hektar</label>
                    <div class="input-group mb-3">
                        <span class="input-group-text">Rp</span>
                        <input v-model="tarifPerHa" type="number" class="form-control fw-bold text-end">
                    </div>
                    <small class="text-muted">
                        <i class="bi bi-info-circle"></i> Tarif ini digunakan untuk mengkalkulasi estimasi pendapatan seluruh alat secara otomatis.
                    </small>
                </div>
            </div>
        </div>

        <div class="col-md-8">
            <div class="card border-0 shadow-sm h-100">
                <div class="card-header bg-white fw-bold py-3">📊 Rincian Per Alat</div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="bg-light">
                                <tr>
                                    <th class="ps-4">Nama Alat</th>
                                    <th class="text-center">Jam Kerja (HM)</th>
                                    <th class="text-center">Luas Tergarap</th>
                                    <th class="text-end pe-4">Estimasi Pendapatan</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="item in items" :key="item.alsintan_id">
                                    <td class="ps-4">
                                        <div class="fw-bold">{{ item.nama_alat }}</div>
                                        <small class="text-muted">{{ item.kode_perangkat }}</small>
                                    </td>
                                    
                                    <td class="text-center">
                                        <span class="badge bg-secondary">{{ item.total_hour_meter || 0 }} Jam</span>
                                    </td>

                                    <td class="text-center">
                                        <div class="fw-bold text-primary">{{ hitungLuas(item.total_jarak_kerja).toFixed(2) }} Ha</div>
                                        
                                        <small class="text-muted" style="font-size: 10px;">
                                            ({{ formatMeter(item.total_jarak_kerja) }} meter)
                                        </small>
                                    </td>

                                    <td class="text-end pe-4 fw-bold text-success">
                                        {{ formatRupiah(hitungLuas(item.total_jarak_kerja) * tarifPerHa) }}
                                    </td>
                                </tr>
                                
                                <tr v-if="items.length === 0">
                                    <td colspan="4" class="text-center py-4 text-muted">Belum ada data rekaman.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

    </div>
  </div>
</template>