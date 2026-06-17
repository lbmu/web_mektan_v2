<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import Swal from 'sweetalert2';
import mqtt from 'mqtt';

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

let mqttClient = null;

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

const getTractorClass = (status) => {
    if (status === 'ON') return 'bg-success text-white animate-pulse shadow-sm';
    if (status === 'OFF') return 'bg-dark text-white-50';
    return 'bg-secondary text-white';
};

const connectMqtt = () => {
    const options = { host: MQTT_HOST, port: MQTT_PORT, protocol: 'wss', path: '/mqtt', username: MQTT_USERNAME, password: MQTT_PASSWORD };
    mqttClient = mqtt.connect(options);
    
    mqttClient.on('connect', () => { mqttClient.subscribe(MQTT_TOPIC); });

    mqttClient.on('message', (topic, message) => {
        try {
            const data = JSON.parse(message.toString());
            const targetIndex = items.value.findIndex(item => item.alsintan_id == data.id);
            if (targetIndex !== -1) {
                const vAki = parseFloat(data.V) || 0;
                let statusBaru = items.value[targetIndex].status_mesin;
                if (vAki > 13.4) statusBaru = 'ON';
                else if (vAki < 13.0) statusBaru = 'OFF';
                items.value[targetIndex].status_mesin = statusBaru;
            }
        } catch (err) {}
    });
};

const goToAdd = () => router.push({ name: 'aset-add' });
const goToEdit = (id) => router.push({ name: 'aset-edit', params: { id } });
const goToDetail = (id) => router.push({ name: 'aset-detail', params: { id } });
const goToMonitoring = (id) => router.push({ name: 'monitoring-detail', params: { id } });

// =====================================================================
// FUNGSI BARU: FORMULIR PENGAJUAN PUBLIK (PETANI TANPA LOGIN)
// =====================================================================
const ajukanPinjaman = async (item) => {
    const { value: formValues } = await Swal.fire({
        title: `Form Reservasi Alsintan<br><span class="text-primary fs-5">${item.nama_alat}</span>`,
        html: `
            <div class="text-start" style="font-size: 0.9rem;">
                <div class="alert alert-info py-2 small mb-3">
                    <i class="bi bi-info-circle-fill me-1"></i> Admin Balai akan menghubungi No. WhatsApp Anda untuk konfirmasi persetujuan alat.
                </div>
                
                <div class="row g-2 mb-2">
                    <div class="col-6"><label class="fw-bold small">Rencana Mulai <span class="text-danger">*</span></label><input type="date" id="swal-mulai" class="form-control form-control-sm" required></div>
                    <div class="col-6"><label class="fw-bold small">Rencana Selesai <span class="text-danger">*</span></label><input type="date" id="swal-akhir" class="form-control form-control-sm" required></div>
                </div>
                <hr class="my-2">
                <div class="mb-2">
                    <label class="fw-bold small text-primary">Nama Lengkap Penanggung Jawab <span class="text-danger">*</span></label>
                    <input type="text" id="swal-nama" class="form-control form-control-sm" placeholder="Sesuai KTP" required>
                </div>
                <div class="row g-2 mb-2">
                    <div class="col-6"><label class="fw-bold small text-primary">Jabatan</label><input type="text" id="swal-jabatan" class="form-control form-control-sm" placeholder="Misal: Ketua"></div>
                    <div class="col-6"><label class="fw-bold small text-primary">No. WhatsApp Aktif <span class="text-danger">*</span></label><input type="text" id="swal-kontak" class="form-control form-control-sm" placeholder="08..." required></div>
                </div>
                <div class="mb-2">
                    <label class="fw-bold small text-primary">Nama Kelompok Tani / UPJA</label>
                    <input type="text" id="swal-poktan" class="form-control form-control-sm" placeholder="Opsional">
                </div>
                <hr class="my-2">
                <div class="row g-2 mb-2">
                    <div class="col-4"><label class="fw-bold small text-success">Desa</label><input type="text" id="swal-desa" class="form-control form-control-sm"></div>
                    <div class="col-4"><label class="fw-bold small text-success">Kecamatan</label><input type="text" id="swal-kec" class="form-control form-control-sm"></div>
                    <div class="col-4"><label class="fw-bold small text-success">Kabupaten</label><input type="text" id="swal-kab" class="form-control form-control-sm"></div>
                </div>
            </div>
        `,
        width: '600px',
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: '<i class="bi bi-send-fill"></i> Kirim Pengajuan',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#198754',
        preConfirm: () => {
            const data = {
                alsintan_id: item.alsintan_id,
                tanggal_mulai: document.getElementById('swal-mulai').value,
                tanggal_berakhir: document.getElementById('swal-akhir').value,
                nama_peminjam: document.getElementById('swal-nama').value,
                jabatan_peminjam: document.getElementById('swal-jabatan').value,
                kontak_peminjam: document.getElementById('swal-kontak').value,
                nama_kelompok: document.getElementById('swal-poktan').value,
                desa: document.getElementById('swal-desa').value,
                kecamatan: document.getElementById('swal-kec').value,
                kabupaten: document.getElementById('swal-kab').value
            };
            
            if(!data.tanggal_mulai || !data.tanggal_berakhir || !data.nama_peminjam || !data.kontak_peminjam) {
                Swal.showValidationMessage('Isi semua kolom yang bertanda bintang (*)!');
                return false;
            }
            return data;
        }
    });

    if (formValues) {
        try {
            Swal.fire({ title: 'Mengirim Pengajuan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/pengajuan/public`, formValues);
            
            Swal.fire('Terkirim!', 'Pengajuan Anda berhasil masuk antrean. Kami akan segera menghubungi nomor WA Anda.', 'success');
        } catch (error) {
            Swal.fire('Gagal', error.response?.data?.message || 'Terjadi kesalahan server.', 'error');
        }
    }
};

const deleteItem = async (id) => {
    const confirm = await Swal.fire({
        title: 'Hapus Aset ini?',
        text: "Data yang dihapus tidak bisa dikembalikan!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus!'
    });

    if (confirm.isConfirmed) {
        try {
            await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/alsintan/${id}`);
            Swal.fire('Terhapus!', 'Data aset telah dihapus.', 'success');
            fetchData();
        } catch (error) {
            Swal.fire('Error', 'Gagal menghapus aset.', 'error');
        }
    }
};

onMounted(() => {
    const session = JSON.parse(sessionStorage.getItem('user'));
    if (session) userRole.value = session.role;
    fetchData();
    connectMqtt();
});

onUnmounted(() => {
    if (mqttClient) mqttClient.end();
});
</script>

<template>
    <div class="container-fluid pb-4">
        
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h2 class="fw-bold text-dark mb-0">Manajemen Aset & Katalog</h2>
                <small class="text-muted">Cek ketersediaan inventaris dan status operasional armada balai.</small>
            </div>
            
            <!-- Dibungkus div agar tombolnya bisa bersebelahan -->
            <div v-if="['super_admin', 'admin'].includes(userRole)" class="d-flex gap-2">
                <!-- TOMBOL MENUJU HALAMAN ANTREAN -->
                <button @click="router.push('/antrean')" class="btn btn-warning fw-bold shadow-sm">
                    <i class="bi bi-inboxes-fill"></i> Cek Antrean Masuk
                </button>
                
                <button @click="goToAdd" class="btn btn-primary fw-bold shadow-sm">
                    <i class="bi bi-plus-lg"></i> Tambah Aset Baru
                </button>
            </div>
        </div>

        <div v-if="loading" class="text-center py-5 my-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2 text-muted fw-bold">Memuat inventaris...</p>
        </div>

        <div v-else class="card border-0 shadow-sm overflow-hidden">
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="bg-light text-muted small text-uppercase" style="letter-spacing: 0.5px;">
                            <tr>
                                <th class="ps-4 py-3">Aset & Ketersediaan</th>
                                <th>ID / Mesin</th>
                                <th>Kapasitas</th>
                                <th class="text-center">Status (IoT)</th>
                                <th class="text-center pe-4">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="item in items" :key="item.alsintan_id" :class="{'bg-dipinjam': item.status_ketersediaan === 'Sedang Dipinjam'}">
                                
                                <td class="ps-4 py-3">
                                    <div class="d-flex align-items-center">
                                        <div class="position-relative me-3">
                                            <img :src="item.gambar && item.gambar.startsWith('http') ? item.gambar : `${IMAGE_BASE_URL}/${item.gambar}`" 
                                                 class="rounded object-fit-cover shadow-sm transition-img" 
                                                 :class="{'grayscale-dim': item.status_ketersediaan === 'Sedang Dipinjam'}"
                                                 style="width: 55px; height: 55px;"
                                                 @error="$event.target.src='https://via.placeholder.com/150'">
                                            
                                            <span class="position-absolute top-0 start-100 translate-middle p-2 border border-2 border-white rounded-circle shadow-sm"
                                                  :class="item.status_ketersediaan === 'Tersedia di Balai' ? 'bg-success' : 'bg-warning'">
                                            </span>
                                        </div>
                                        
                                        <div>
                                            <h6 class="fw-bold mb-1 text-dark" :class="{'text-muted': item.status_ketersediaan === 'Sedang Dipinjam'}">
                                                {{ item.nama_alat }}
                                            </h6>
                                            
                                            <div class="d-flex flex-wrap gap-2 align-items-center mb-1">
                                                <span v-if="item.status_ketersediaan === 'Tersedia di Balai'" class="badge bg-success bg-opacity-10 text-success border border-success" style="font-size: 0.65rem;">
                                                    <i class="bi bi-building-check me-1"></i>TERSEDIA
                                                </span>
                                                <span v-else-if="item.status_ketersediaan === 'Sedang Dipinjam'" class="badge bg-warning bg-opacity-10 text-warning-emphasis border border-warning" style="font-size: 0.65rem;">
                                                    <i class="bi bi-signpost-2-fill me-1"></i>DIPINJAM
                                                </span>
                                                <span v-else class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary" style="font-size: 0.65rem;">
                                                    {{ item.status_ketersediaan?.toUpperCase() || 'MAINTENANCE' }}
                                                </span>

                                                <span class="badge bg-light text-muted border border-secondary" style="font-size: 0.65rem;">
                                                    <i class="bi bi-wrench-adjustable me-1"></i>{{ item.kondisi_fisik || 'Baik' }}
                                                </span>
                                            </div>
                                            
                                            <small class="text-muted d-block mt-1" style="font-size: 0.75rem;">
                                                {{ item.kategori_alat }} • {{ item.merk_alat || '-' }}
                                            </small>
                                        </div>
                                    </div>
                                </td>

                                <td>
                                    <span class="badge border border-primary text-primary px-2 mb-1">{{ item.kode_perangkat }}</span>
                                    <br>
                                    <small class="text-muted fw-bold">SN: {{ item.nomor_seri || '-' }}</small>
                                </td>

                                <td>
                                    <span class="fw-bold text-dark">{{ item.kapasitas_lahan || '-' }}</span>
                                    <small class="text-muted ms-1">Ha / Hari</small>
                                </td>

                                <td>
                                    <div class="d-flex flex-column gap-1">
                                        <span class="badge w-100 py-2 text-center" :class="getTractorClass(item.status_mesin)">
                                            <i class="bi bi-power me-1"></i> MESIN: {{ item.status_mesin || 'OFF' }}
                                        </span>
                                        <small class="text-muted text-center w-75 mt-1" style="font-size: 0.7rem;">
                                            <i class="bi bi-speedometer2"></i> {{ (parseFloat(item.total_jarak_kerja || 0) / 1000).toFixed(2) }} Km
                                        </small>
                                    </div>
                                </td>

                                <td class="text-center pe-4">
                                    
                                    <div v-if="!userRole">
                                        <button @click="goToDetail(item.alsintan_id)" class="btn btn-sm btn-outline-info me-2" title="Lihat Spesifikasi">
                                            <i class="bi bi-info-circle"></i> Detail
                                        </button>
                                        
                                        <button v-if="item.status_ketersediaan === 'Tersedia di Balai'" 
                                                @click="ajukanPinjaman(item)" 
                                                class="btn btn-sm btn-success fw-bold shadow-sm" 
                                                title="Booking Alat Ini">
                                            <i class="bi bi-calendar-plus-fill me-1"></i> Booking
                                        </button>
                                    </div>

                                    <div v-else class="btn-group">
                                        <button @click="goToDetail(item.alsintan_id)" class="btn btn-sm btn-outline-info" title="Detail Administrasi">
                                            <i class="bi bi-info-circle"></i>
                                        </button>
                                        <button @click="goToMonitoring(item.alsintan_id)" class="btn btn-sm btn-outline-primary" title="Kendali Peta & Argo">
                                            <i class="bi bi-geo-alt-fill"></i>
                                        </button>
                                        
                                        <button v-if="['super_admin', 'admin'].includes(userRole)" @click="goToEdit(item.alsintan_id)" class="btn btn-sm btn-outline-warning" title="Edit Data">
                                            <i class="bi bi-pencil-square"></i>
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

        <div class="text-center mt-5 pt-3 border-top text-muted" style="font-size: 0.75rem; letter-spacing: 0.5px;">
            &copy; 2026 Balai Pengembangan Mekanisasi Pertanian - Pemprov Jawa Barat. Versi 1.1.0
        </div>

    </div>
</template>

<style scoped>
.animate-pulse { animation: pulse 1.5s infinite; }
@keyframes pulse {
  0% { opacity: 1; box-shadow: 0 0 0 0 rgba(25, 135, 84, 0.7); }
  70% { opacity: 0.8; box-shadow: 0 0 0 6px rgba(25, 135, 84, 0); }
  100% { opacity: 1; box-shadow: 0 0 0 0 rgba(25, 135, 84, 0); }
}

.transition-img { transition: all 0.3s ease; }

.grayscale-dim { 
    filter: grayscale(100%) contrast(80%); 
    opacity: 0.6; 
}

.bg-dipinjam td { 
    background-color: #fffff8 !important; 
}
</style>