<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import Swal from 'sweetalert2';

const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL;
const antrean = ref([]);
const loading = ref(true);

const fetchAntrean = async () => {
    try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/pengajuan/admin`);
        antrean.value = response.data;
    } catch (error) {
        console.error("Gagal mengambil antrean:", error);
    } finally {
        loading.value = false;
    }
};

// Format nomor WA agar otomatis memakai 62 (Kode Indonesia) untuk link Chat
const formatWA = (nomor) => {
    let formatted = nomor.replace(/\D/g, ''); // Hapus karakter non-angka
    if (formatted.startsWith('0')) formatted = '62' + formatted.slice(1);
    return formatted;
};

const handleACC = async (item) => {
    const { value: formValues } = await Swal.fire({
        title: 'Terbitkan Surat Jalan',
        html: `
            <div class="text-start">
                <div class="alert alert-success py-2 small mb-3">
                    <i class="bi bi-check-circle-fill me-1"></i> ACC pengajuan <b>${item.nama_alat}</b> untuk <b>${item.nama_peminjam}</b>.
                </div>
                <label class="form-label fw-bold small">Nomor Berita Acara (BA) <span class="text-danger">*</span></label>
                <input id="swal-ba" class="form-control mb-3" placeholder="Misal: 4662/PT.04.05/Mektan" required>
                
                <label class="form-label fw-bold small">Estimasi Biaya Jasa (Rp)</label>
                <input type="number" id="swal-biaya" class="form-control" placeholder="0">
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: '<i class="bi bi-file-earmark-check-fill"></i> ACC & Terbitkan',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#198754',
        preConfirm: () => {
            const ba = document.getElementById('swal-ba').value;
            const biaya = document.getElementById('swal-biaya').value;
            if (!ba) {
                Swal.showValidationMessage('Nomor BA wajib diisi untuk menerbitkan surat jalan!');
                return false;
            }
            return { nomor_ba: ba, biaya_jasa: biaya };
        }
    });

    if (formValues) {
        try {
            Swal.fire({ title: 'Memproses Surat Jalan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/pengajuan/admin/acc/${item.id_pengajuan}`, formValues);
            
            fetchAntrean(); // Refresh data antrean di latar belakang

            // [BARU] Membuat Data String untuk QR Code
            const qrData = `BA:${formValues.nomor_ba} | Alat:${item.nama_alat} | Peminjam:${item.nama_peminjam}`;
            // Menggunakan layanan API Publik untuk generate QR Code secara instan
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

            // [BARU] Menampilkan Pop-Up Surat Jalan Digital
            Swal.fire({
                title: 'Surat Jalan Digital Terbit!',
                html: `
                    <div class="text-center">
                        <p class="text-muted small mb-3">Tunjukkan QR Code ini kepada petugas gerbang balai.</p>
                        <img src="${qrUrl}" class="border p-2 rounded shadow-sm mb-3" alt="QR Code Surat Jalan">
                        <div class="bg-light p-2 rounded text-start small border border-success border-opacity-25">
                            <b>No. BA:</b> ${formValues.nomor_ba}<br>
                            <b>Peminjam:</b> ${item.nama_peminjam}<br>
                            <b>Alat:</b> ${item.nama_alat} (${item.kode_perangkat})<br>
                            <b>Estimasi Jasa:</b> Rp ${Number(formValues.biaya_jasa || 0).toLocaleString('id-ID')}
                        </div>
                    </div>
                `,
                icon: 'success',
                confirmButtonText: '<i class="bi bi-check-lg"></i> Tutup & Selesai',
                confirmButtonColor: '#198754'
            });

        } catch (error) {
            Swal.fire('Gagal', error.response?.data?.message || 'Terjadi kesalahan.', 'error');
        }
    }
};

const handleTolak = async (id) => {
    const confirm = await Swal.fire({
        title: 'Tolak Pengajuan?',
        text: "Pengajuan ini akan dihapus dari antrean.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Ya, Tolak'
    });

    if (confirm.isConfirmed) {
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/pengajuan/admin/tolak/${id}`);
            Swal.fire('Ditolak!', 'Pengajuan telah dihapus dari antrean.', 'success');
            fetchAntrean();
        } catch (error) {
            Swal.fire('Error', 'Gagal menolak pengajuan.', 'error');
        }
    }
};

onMounted(() => {
    fetchAntrean();
});
</script>

<template>
    <div class="container-fluid pb-4">
        
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h2 class="fw-bold text-dark mb-0"><i class="bi bi-inboxes text-primary me-2"></i>Antrean Reservasi</h2>
                <small class="text-muted">Kelola pengajuan peminjaman alat dari masyarakat.</small>
            </div>
            <button @click="fetchAntrean" class="btn btn-outline-secondary btn-sm shadow-sm">
                <i class="bi bi-arrow-clockwise"></i> Segarkan Data
            </button>
        </div>

        <div v-if="loading" class="text-center py-5 my-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2 text-muted fw-bold">Memuat antrean...</p>
        </div>

        <div v-else-if="antrean.length === 0" class="card border-0 shadow-sm py-5 text-center bg-light">
            <div class="card-body opacity-50">
                <i class="bi bi-check2-circle display-1 text-success mb-3"></i>
                <h4 class="fw-bold text-dark">Tidak ada antrean baru</h4>
                <p class="text-muted">Semua pengajuan peminjaman telah diproses.</p>
            </div>
        </div>

        <div v-else class="row g-4">
            <!-- Looping Kartu Pengajuan -->
            <div v-for="item in antrean" :key="item.id_pengajuan" class="col-md-6 col-lg-6">
                <div class="card border-0 shadow-sm h-100 position-relative overflow-hidden border-start border-warning border-4">
                    <div class="card-body">
                        
                        <!-- Header Kartu -->
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <span class="badge bg-warning text-dark shadow-sm px-3 py-2 rounded-pill">
                                <i class="bi bi-hourglass-split me-1"></i> MENUNGGU REVIEW
                            </span>
                            <small class="text-muted fw-bold">
                                <i class="bi bi-clock"></i> Masuk: {{ new Date(item.created_at).toLocaleDateString('id-ID') }}
                            </small>
                        </div>

                        <div class="row g-3">
                            <!-- Profil Peminjam -->
                            <div class="col-sm-7 border-end pe-3">
                                <h5 class="fw-bold text-primary mb-1">{{ item.nama_peminjam }}</h5>
                                <p class="small text-muted mb-2">
                                    {{ item.jabatan_peminjam || 'Pengaju' }} {{ item.nama_kelompok ? `• ${item.nama_kelompok}` : '' }}
                                </p>
                                
                                <a :href="`https://wa.me/${formatWA(item.kontak_peminjam)}`" target="_blank" class="btn btn-sm btn-success fw-bold px-3 mb-3 shadow-sm rounded-pill">
                                    <i class="bi bi-whatsapp"></i> Chat WhatsApp
                                </a>

                                <div class="bg-light p-2 rounded small">
                                    <div class="fw-bold text-muted mb-1"><i class="bi bi-geo-alt-fill text-danger me-1"></i>Lokasi Operasional</div>
                                    Ds. {{ item.desa }}, Kec. {{ item.kecamatan }}, Kab. {{ item.kabupaten }}
                                </div>
                            </div>

                            <!-- Detail Alat -->
                            <div class="col-sm-5 text-center">
                                <img :src="item.gambar && item.gambar.startsWith('http') ? item.gambar : `${IMAGE_BASE_URL}/${item.gambar}`" 
                                     class="rounded shadow-sm object-fit-cover mb-2" 
                                     style="width: 100%; height: 90px;">
                                <h6 class="fw-bold text-dark mb-0" style="font-size: 0.9rem;">{{ item.nama_alat }}</h6>
                                <span class="badge border border-secondary text-secondary mt-1">{{ item.kode_perangkat }}</span>
                            </div>
                        </div>

                        <!-- Info Rencana Tanggal -->
                        <div class="mt-3 p-2 border rounded border-primary bg-primary bg-opacity-10 d-flex justify-content-between align-items-center">
                            <div class="text-center px-2">
                                <small class="text-muted fw-bold d-block">Mulai Pinjam</small>
                                <span class="fw-bold text-primary">{{ new Date(item.tanggal_mulai).toLocaleDateString('id-ID') }}</span>
                            </div>
                            <i class="bi bi-arrow-right fw-bold text-primary"></i>
                            <div class="text-center px-2">
                                <small class="text-muted fw-bold d-block">Rencana Kembali</small>
                                <span class="fw-bold text-primary">{{ new Date(item.tanggal_berakhir).toLocaleDateString('id-ID') }}</span>
                            </div>
                        </div>

                    </div>

                    <!-- Tombol Aksi -->
                    <div class="card-footer bg-white border-top p-3 d-flex gap-2">
                        <button @click="handleTolak(item.id_pengajuan)" class="btn btn-outline-danger w-50 fw-bold">
                            <i class="bi bi-x-lg"></i> Tolak
                        </button>
                        <button @click="handleACC(item)" class="btn btn-success w-50 fw-bold shadow-sm">
                            <i class="bi bi-check2-all"></i> ACC Pengajuan
                        </button>
                    </div>

                </div>
            </div>
        </div>

    </div>
</template>