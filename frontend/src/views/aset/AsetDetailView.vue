<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const router = useRouter();

// ID diambil dari URL (contoh: /aset/1 -> id = 1)
const id = route.params.id;

const item = ref(null);
const loading = ref(true);
const errorMessage = ref('');

// Fungsi Ambil Data Detail
const fetchDetail = async () => {
    try {
        const response = await axios.get(`http://localhost:3000/api/alsintan/${id}`);
        item.value = response.data;
    } catch (error) {
        console.error("Gagal ambil detail:", error);
        errorMessage.value = "Data tidak ditemukan atau terjadi kesalahan server.";
    } finally {
        loading.value = false;
    }
};

const goBack = () => {
    router.push({ name: 'aset-list' });
}; 

// Fungsi Hapus Aset (Opsional, untuk melengkapi fitur)
const deleteAset = async () => {
    if (confirm('Apakah Anda yakin ingin menghapus aset ini? Data tidak bisa dikembalikan.')) {
        try {
            await axios.delete(`http://localhost:3000/api/alsintan/${id}`);
            alert('Aset berhasil dihapus.');
            router.push('/aset');
        } catch (error) {
            alert('Gagal menghapus data.');
        }
    }
};

onMounted(() => {
    fetchDetail();
});
</script>

<template>
    <div class="container-fluid">
    
        <div class="d-flex justify-content-between align-items-center mb-4">
            <button @click="goBack" class="btn btn-outline-secondary">
                <i class="bi bi-arrow-left"></i> Kembali
            </button>

            <div v-if="item">
                <RouterLink :to="`/aset/edit/${item.alsintan_id}`" class="btn btn-warning btn-sm me-2">
                    <i class="bi bi-pencil"></i> Edit
                </RouterLink>
                
                <button @click="deleteAset" class="btn btn-danger btn-sm">
                    <i class="bi bi-trash"></i> Hapus Aset
                </button>
            </div>
        </div>

        <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2 text-muted">Memuat detail aset...</p>
        </div>

        <div v-else-if="errorMessage" class="alert alert-danger">
            {{ errorMessage }}
        </div>

        <div v-else class="row g-4">
    
            <div class="col-lg-4 col-md-5">
                <div class="card border-0 shadow-sm h-100">
                    <div class="card-body text-center p-4">
            
                        <div class="mb-4 position-relative d-inline-block">
                            <img 
                                :src="`http://localhost:3000/uploads/${item.gambar}`" 
                                class="img-fluid rounded shadow-sm"
                                style="max-height: 300px; object-fit: cover;"
                                alt="Foto Alat"
                                @error="$event.target.src='https://via.placeholder.com/300x200?text=No+Image'"
                            >
                            <span class="position-absolute top-0 end-0 badge rounded-pill m-2 fs-6"
                                :class="item.status === 'ON' ? 'bg-success' : 'bg-secondary'">
                                {{ item.status }}
                            </span>
                        </div>

                        <h4 class="fw-bold text-dark">{{ item.nama_alat }}</h4>
                        <p class="text-muted mb-3">{{ item.kategori_alat }}</p>

                        <div class="d-flex justify-content-center gap-2 mt-3">
                            <div class="card bg-light border-0 p-2 flex-fill">
                                <small class="text-muted d-block">Sensor</small>
                                <span class="fw-bold" 
                                    :class="{'text-danger': item.status_sensor === 'Error', 'text-success': item.status_sensor === 'Normal'}">
                                    {{ item.status_sensor }}
                                </span>
                            </div>
                            <div class="card bg-light border-0 p-2 flex-fill">
                                <small class="text-muted d-block">Operasional</small>
                                <span class="fw-bold text-dark">{{ item.status_operasional }}</span>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <div class="col-lg-8 col-md-7">
                <div class="card border-0 shadow-sm h-100">
                    <div class="card-header bg-white py-3">
                        <h5 class="mb-0 fw-bold text-primary">📄 Spesifikasi & Detail</h5>
                    </div>
                    <div class="card-body">
            
                        <div class="table-responsive">
                            <table class="table table-borderless">
                                <tbody>
                                    <tr>
                                        <td class="text-muted" width="30%">Kode Perangkat</td>
                                        <td class="fw-bold">: {{ item.kode_perangkat }}</td>
                                    </tr>
                                    <tr>
                                        <td class="text-muted">Merk / Brand</td>
                                        <td class="fw-bold">: {{ item.merk_alat || '-' }}</td>
                                    </tr>
                                    <tr>
                                        <td class="text-muted">Nomor Seri</td>
                                        <td class="fw-bold">: {{ item.nomor_seri || '-' }}</td>
                                    </tr>
                                    <tr>
                                        <td class="text-muted">Kapasitas Lahan</td>
                                        <td class="fw-bold">: {{ item.kapasitas_lahan || '-' }}</td>
                                    </tr>
                                    <tr>
                                        <td class="text-muted">Tanggal Input</td>
                                        <td class="fw-bold">: {{ new Date(item.created_at).toLocaleDateString('id-ID') }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <hr>

                        <h6 class="fw-bold text-dark mt-3">Deskripsi</h6>
                        <p class="text-muted" style="white-space: pre-line;">
                            {{ item.deskripsi || 'Tidak ada deskripsi tambahan.' }}
                        </p>

                    </div>
                </div>
            </div>

        </div>
    </div>
</template>