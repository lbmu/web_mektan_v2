<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';

const items = ref([]);
const loading = ref(true);
const userRole = ref('');

// Tarif default (Hanya Super Admin yang bisa edit di UI)
const tarifPerHa = ref(1500000); 

const fetchData = async () => {
    try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/alsintan`);
        items.value = response.data;
    } catch (error) {
        console.error("Gagal ambil data:", error);
    } finally {
        loading.value = false;
    }
};

const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
};

const hitungLuas = (jarakMeter) => {
    const m = parseFloat(jarakMeter) || 0;
    return m / 2500; // Konversi meter persegi ke hektar
};

const totalOmzetSemuaAlat = computed(() => {
    return items.value.reduce((total, item) => {
        const luas = hitungLuas(item.total_jarak_kerja);
        return total + (luas * tarifPerHa.value);
    }, 0);
});

onMounted(() => {
    const session = JSON.parse(localStorage.getItem('user'));
    if (session) userRole.value = session.role;
    fetchData();
});
</script>

<template>
  <div class="container-fluid">
    
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h3 class="fw-bold text-dark mb-0">📘 Buku Besar & Estimasi</h3>
        <p class="text-muted small">Rekapitulasi total pendapatan seluruh armada untuk sesi aktif saat ini.</p>
      </div>
      
      <div class="card bg-success text-white border-0 shadow-sm" style="min-width: 250px;">
        <div class="card-body py-2 px-3 text-end">
            <small class="d-block text-white-50 text-uppercase fw-bold">Total Akumulasi Global</small>
            <h3 class="fw-bold mb-0">{{ formatRupiah(totalOmzetSemuaAlat) }}</h3>
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
                    <label class="form-label text-muted small">Harga Jasa per Hektar (Acuan)</label>
                    <div class="input-group mb-3">
                        <span class="input-group-text bg-light border-end-0">Rp</span>
                        <input v-model="tarifPerHa" type="number" 
                               class="form-control fw-bold border-start-0 text-end"
                               :disabled="!['super_admin'].includes(userRole)">
                    </div>
                    
                    <div v-if="!['super_admin'].includes(userRole)" class="alert alert-warning py-2 small mb-0">
                        <i class="bi bi-lock-fill"></i> Hanya <b>Super Admin</b> yang dapat mengubah acuan tarif dasar.
                    </div>
                    <small v-else class="text-muted" style="font-size:11px;">
                        <i class="bi bi-info-circle"></i> Perubahan tarif akan langsung mengkalkulasi ulang seluruh tabel.
                    </small>
                </div>
            </div>
        </div>

        <div class="col-md-8">
            <div class="card border-0 shadow-sm h-100">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="bg-light">
                                <tr>
                                    <th class="ps-4">Nama Armada</th>
                                    <th class="text-center">Jam Kerja (HM)</th>
                                    <th class="text-center">Luas Tergarap</th>
                                    <th class="text-end pe-4">Estimasi Pendapatan</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="item in items" :key="item.alsintan_id">
                                    <td class="ps-4">
                                        <div class="fw-bold text-dark">{{ item.nama_alat }}</div>
                                        <span class="badge bg-secondary text-white fw-normal" style="font-size: 10px;">{{ item.kode_perangkat }}</span>
                                    </td>
                                    
                                    <td class="text-center">
                                        <span class="fw-bold">{{ item.total_hour_meter || 0 }} <small class="text-muted fw-normal">Jam</small></span>
                                    </td>

                                    <td class="text-center">
                                        <div class="fw-bold text-primary">{{ hitungLuas(item.total_jarak_kerja).toFixed(3) }} Ha</div>
                                        <small class="text-muted" style="font-size: 10px;">
                                            ({{ (item.total_jarak_kerja || 0).toFixed(0) }} meter)
                                        </small>
                                    </td>

                                    <td class="text-end pe-4 fw-bold text-success fs-6">
                                        {{ formatRupiah(hitungLuas(item.total_jarak_kerja) * tarifPerHa) }}
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
</template>