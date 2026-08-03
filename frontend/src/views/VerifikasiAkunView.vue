<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import Swal from 'sweetalert2';

const pendingUsers = ref([]);
const loading = ref(true);

const fetchPendingUsers = async () => {
    loading.value = true;
    try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/users/pending`);
        pendingUsers.value = response.data.data || [];
    } catch (error) {
        console.error("Gagal mengambil data akun pending:", error);
    } finally {
        loading.value = false;
    }
};

const handleVerify = async (user, action) => {
    const isAcc = action === 'aktif';
    const confirm = await Swal.fire({
        title: isAcc ? 'Aktifkan Akun Ini' : 'Tolak Akun Ini?',
        html: `Anda akan ${isAcc ? 'mengaktifkan' : '<span class="text-danger">menolak</span>'} akses untuk <b>${user.nama_lengkap}</b>.`,
        icon: isAcc ? 'question' : 'warning',
        showCancelButton: true,
        confirmButtonColor: isAcc ? '#198754' : '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: isAcc ? 'Ya, Aktifkan' : 'Ya, Tolak'
    });

    if (confirm.isConfirmed) {
        try {
            Swal.fire({ title: 'Memproses...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            
            const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/users/verify/${user.user_id}`, { action });
            
            Swal.fire('Berhasil!', response.data.message, 'success');
            fetchPendingUsers(); // Segarkan tabel
        } catch (error) {
            Swal.fire('Gagal', 'Terjadi kesalahan saat memproses verifikasi.', 'error');
        }
    }
};

onMounted(() => {
    fetchPendingUsers();
});
</script>

<template>
    <div class="container-fluid pb-4">
        
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h2 class="fw-bold text-dark mb-0"><i class="bi bi-person-lines-fill text-primary me-2"></i>Verifikasi Akun</h2>
                <small class="text-muted">Tinjau dan setujui pendaftaran akun Usaha Pelayanan Jasa Alsintan baru</small>
            </div>
            <button @click="fetchPendingUsers" class="btn btn-outline-secondary btn-sm shadow-sm">
                <i class="bi bi-arrow-clockwise"></i> Segarkan
            </button>
        </div>

        <div v-if="loading" class="text-center py-5 my-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2 text-muted fw-bold">Memuat daftar antrean...</p>
        </div>

        <div v-else-if="pendingUsers.length === 0" class="card border-0 shadow-sm py-5 text-center bg-light">
            <div class="card-body opacity-50">
                <i class="bi bi-shield-check display-1 text-success mb-3"></i>
                <h4 class="fw-bold text-dark">Tidak Ada Antrean Pendaftaran</h4>
                <p class="text-muted">Semua pendaftar akun UPJA telah diverifikasi.</p>
            </div>
        </div>

        <div v-else class="card border-0 shadow-sm overflow-hidden border-top border-primary border-4">
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="bg-light text-muted small text-uppercase">
                            <tr>
                                <th class="ps-4 py-3">Nama Lengkap & Kontak</th>
                                <th class="ps-4 py-3">Email / Username</th>
                                <th class="ps-4 py-3">Peran Diajukan</th>
                                <th class="text-center pe-4 py-3">Verifikasi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="user in pendingUsers" :key="user.user_id">
                                <td class="ps-4 py-3">
                                    <h6 class="fw-bold mb-1 text-dark">{{ user.nama_lengkap }}</h6>
                                    <small class="text-muted"><i class="bi bi-telephone-fill me-1"></i>{{ user.no_hp || '-' }}</small>
                                </td>
                                <td class="ps-4 py-3">
                                    <span class="d-block fw-bold text-dark">{{ user.email }}</span>
                                    <small class="text-muted">@{{ user.username }}</small>
                                </td>
                                <td class="ps-5 py-3">
                                    <span class="badge bg-warning text-dark px-3 py-2 text-uppercase">
                                        <i class="bi bi-hourglass-split me-1"></i> {{ user.role }}
                                    </span>
                                </td>
                                <td class="text-center pe-4 py-3">
                                    <div class="btn-group shadow-sm">
                                        <button @click="handleVerify(user, 'ditolak')" class="btn btn-sm btn-outline-danger px-3" title="Tolak Pendaftaran">
                                            <i class="bi bi-x-lg"></i> Tolak
                                        </button>
                                        <button @click="handleVerify(user, 'aktif')" class="btn btn-sm btn-success px-3 fw-bold" title="Setujui dan Aktifkan">
                                            <i class="bi bi-check-lg me-1"></i> Aktifkan
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
</template>