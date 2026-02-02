<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { RouterLink } from 'vue-router';

const items = ref([]);
const loading = ref(true);

const fetchData = async () => {
    try {
        const response = await axios.get('http://localhost:8000/api/aset');
        items.value = response.data;
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        loading.value = false;
    }
}

onMounted(() => {
    fetchData();
});
</script>

<template>
    <div class="container-fluid">
    
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2 class="fw-bold text-dark mb-0">🛠️ Manajemen Aset</h2>
            <RouterLink to="/aset/tambah" class="btn btn-primary fw-bold">
                <i class="bi bi-plus-lg"></i> Tambah Aset
            </RouterLink>
        </div>

        <div v-if="loading" class="text-center mt-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2 text-muted">Memuat data aset...</p>
        </div>

        <div v-else class="card card-modern bg-white border-0 shadow-sm">
            <div class="card-body p-0">
        
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="bg-light text-secondary">
                            <tr>
                                <th class="ps-4 py-3">Aset</th> <th>Kategori</th>
                                <th>Kode / Seri</th>
                                <th>Status</th>
                                <th class="text-end pe-4">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="item in items" :key="item.alsintan_id">
                
                                <td class="ps-4 py-3">
                                    <div class="d-flex align-items-center">
                                        <img 
                                            :src="`http://localhost:3000/uploads/${item.gambar}`" 
                                            class="rounded object-fit-cover me-3"
                                            style="width: 50px; height: 50px; background-color: #eee;"
                                            alt="foto"
                                            @error="$event.target.src='https://via.placeholder.com/50?text=No+Img'"
                                        >
                                        <div>
                                            <div class="fw-bold text-dark">{{ item.nama_alat }}</div>
                                            <small class="text-muted">{{ item.merk_alat }}</small>
                                        </div>
                                    </div>
                                </td>

                                <td>{{ item.kategori_alat }}</td>

                                <td>
                                    <div class="badge bg-light text-dark border">
                                        {{ item.kode_perangkat }}
                                    </div>
                                    <div class="small text-muted mt-1">{{ item.nomor_seri }}</div>
                                </td>

                                <td>
                                    <span class="badge me-1" 
                                        :class="item.status === 'ON' ? 'bg-success' : 'bg-secondary'">
                                        {{ item.status }}
                                    </span>
                                    <small class="d-block text-muted mt-1" style="font-size: 0.75rem;">
                                        {{ item.status_operasional }}
                                    </small>
                                </td>

                                <td class="text-end pe-4">
                                    <RouterLink :to="`/aset/${item.alsintan_id}`" class="btn btn-sm btn-outline-primary me-2">
                                        <i class="bi bi-eye"></i> Detail
                                    </RouterLink>
                                </td>

                            </tr>

                            <tr v-if="items.length === 0">
                                <td colspan="5" class="text-center py-5 text-muted">
                                    <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                                    Belum ada data aset. Silakan tambah baru.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    </div>
</template>