<script setup>
import { ref } from 'vue';
import Swal from 'sweetalert2';

// State sementara untuk form
const newDeviceId = ref('');
const newDeviceMac = ref('');
const isLoading = ref(false);

// Fungsi simulasi mendaftarkan alat baru
const handleRegisterDevice = () => {
    if (!newDeviceId.value) return;
    isLoading.value = true;
    
    // Nanti ini diganti dengan request Axios ke Backend Node.js Anda
    setTimeout(() => {
        isLoading.value = false;
        Swal.fire('Berhasil!', `Alat dengan ID ${newDeviceId.value} berhasil didaftarkan ke sistem.`, 'success');
        newDeviceId.value = '';
        newDeviceMac.value = '';
    }, 1500);
};

// Fungsi simulasi menghapus data dummy
const handleClearDummyData = () => {
    Swal.fire({
        title: 'PERINGATAN KRITIS!',
        text: 'Anda akan menghapus semua riwayat perjalanan yang memiliki koordinat (0,0). Tindakan ini tidak bisa dibatalkan!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Ya, Bersihkan Database!',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire('Terhapus!', 'Database telah dibersihkan dari data sampah.', 'success');
        }
    });
};
</script>

<template>
    <div class="container-fluid p-4 dashboard-dev">
        <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom border-secondary">
            <div>
                <h2 class="fw-bolder text-dark mb-0">
                    <i class="bi bi-terminal-dash text-primary me-2"></i>Developer Control Panel
                </h2>
                <p class="text-muted mb-0 mt-1 small">Akses eksklusif Super Admin untuk konfigurasi sistem dan manajemen hardware.</p>
            </div>
            <div class="badge bg-dark px-3 py-2 fs-6 rounded-pill shadow-sm border border-secondary">
                <i class="bi bi-shield-lock-fill text-success me-2"></i>System Secured
            </div>
        </div>

        <div class="row g-4">
            <div class="col-lg-7">
                
                <div class="card border-0 shadow-sm mb-4">
                    <div class="card-header bg-white border-bottom-0 pt-4 pb-0">
                        <h6 class="fw-bold text-primary"><i class="bi bi-cpu-fill me-2"></i>Registrasi Perangkat IoT Baru</h6>
                    </div>
                    <div class="card-body">
                        <p class="text-muted small mb-4">Daftarkan ID Modul (ESP32/SIM7600) sebelum dipasang ke traktor klien agar dikenali oleh database.</p>
                        
                        <form @submit.prevent="handleRegisterDevice" class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label small fw-bold text-muted">ID Alat (Unik)</label>
                                <input v-model="newDeviceId" type="text" class="form-control font-monospace" placeholder="Misal: TRK-003" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold text-muted">MAC Address / IMEI (Opsional)</label>
                                <input v-model="newDeviceMac" type="text" class="form-control font-monospace" placeholder="XX:XX:XX:XX:XX">
                            </div>
                            <div class="col-12 mt-4">
                                <button type="submit" class="btn btn-primary fw-bold px-4" :disabled="isLoading">
                                    <span v-if="isLoading" class="spinner-border spinner-border-sm me-2"></span>
                                    <i v-else class="bi bi-plus-circle-fill me-2"></i>Daftarkan Perangkat
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <div class="card border-0 shadow-sm">
                    <div class="card-body p-4">
                        <h6 class="fw-bold text-secondary mb-4"><i class="bi bi-activity me-2"></i>Status Layanan Backend</h6>
                        
                        <div class="d-flex align-items-center mb-3">
                            <div class="spinner-grow spinner-grow-sm text-success me-3" role="status"></div>
                            <div class="flex-grow-1">
                                <h6 class="mb-0 fw-bold">PostgreSQL Database</h6>
                                <small class="text-muted font-monospace">Connected (Port 5432)</small>
                            </div>
                            <span class="badge bg-success-subtle text-success">Normal</span>
                        </div>
                        
                        <div class="d-flex align-items-center">
                            <div class="spinner-grow spinner-grow-sm text-success me-3" role="status"></div>
                            <div class="flex-grow-1">
                                <h6 class="mb-0 fw-bold">MQTT Broker (HiveMQ)</h6>
                                <small class="text-muted font-monospace">Subscribed: project-mektan/v1/data</small>
                            </div>
                            <span class="badge bg-success-subtle text-success">Normal</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-lg-5">
                
                <div class="card border-danger border-2 shadow-sm mb-4 bg-danger-subtle">
                    <div class="card-body p-4">
                        <h6 class="fw-bold text-danger mb-3"><i class="bi bi-exclamation-triangle-fill me-2"></i>Danger Zone</h6>
                        <p class="text-danger-emphasis small mb-4">
                            Area ini berisi fungsi destruktif. Gunakan hanya saat masa pengembangan atau untuk membersihkan data corrupt.
                        </p>
                        <div class="d-grid">
                            <button @click="handleClearDummyData" class="btn btn-danger fw-bold">
                                <i class="bi bi-trash3-fill me-2"></i>Hapus Data Koordinat (0,0)
                            </button>
                        </div>
                    </div>
                </div>

                <div class="card border-0 shadow-sm bg-dark text-light rounded-3 overflow-hidden">
                    <div class="card-header bg-black border-bottom border-secondary py-2">
                        <small class="font-monospace text-secondary"><i class="bi bi-terminal me-2"></i>system_log.sh</small>
                    </div>
                    <div class="card-body p-3 font-monospace small" style="height: 200px; overflow-y: auto;">
                        <div class="text-success">[sys] Developer Area initialized.</div>
                        <div class="text-success">[sys] RBAC Guard active.</div>
                        <div class="text-info">[mqtt] Waiting for incoming payload...</div>
                        <div class="text-secondary mt-2">-- Live data stream akan muncul di sini (Tahap Integrasi Backend) --</div>
                    </div>
                </div>

            </div>
        </div>
    </div>
</template>

<style scoped>
.font-monospace {
    font-family: 'Fira Code', 'Courier New', Courier, monospace !important;
}
.dashboard-dev {
    background-color: #f8fafc;
    min-height: 100%;
}
</style>