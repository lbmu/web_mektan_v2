<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import Swal from 'sweetalert2';

const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const route = useRoute();
const router = useRouter();
const id = route.params.id;

const item = ref(null);
const transaksiAktif = ref(null);
const loading = ref(true);
const userRole = ref(''); 

onMounted(() => {
    const session = JSON.parse(sessionStorage.getItem('user'));
    if (session) userRole.value = session.role;
    fetchDetail();
});

const fetchDetail = async () => {
    loading.value = true;
    try {
        // 1. Ambil Data Alat
        const response = await axios.get(`${API_BASE_URL}/alsintan/${id}`);
        item.value = response.data;

        // 2. Jika statusnya Sedang Dipinjam, ambil data transaksinya dari backend
        if (item.value.status_ketersediaan === 'Sedang Dipinjam') {
            try {
                const resTx = await axios.get(`${API_BASE_URL}/peminjaman/aktif/${id}`);
                transaksiAktif.value = resTx.data;
            } catch (errTx) {
                console.warn("Belum ada rute transaksi aktif di backend");
            }
        }
    } catch (error) {
        Swal.fire('Error', 'Data tidak ditemukan', 'error');
        router.push('/aset');
    } finally {
        loading.value = false;
    }
};

const getKondisiBadge = (kondisi) => {
    if (kondisi === 'Baik') return 'bg-success';
    if (kondisi === 'Rusak Ringan') return 'bg-warning text-dark';
    if (kondisi === 'Rusak Berat') return 'bg-danger';
    return 'bg-secondary';
};

const handlePinjamkan = async () => {
    const { value: formValues } = await Swal.fire({
        title: 'Formulir Surat Jalan Peminjaman',
        html: `
            <div class="text-start" style="font-size: 0.9rem;">
                <div class="row g-2 mb-2">
                    <div class="col-6"><label class="fw-bold small">Mulai Pinjam</label><input type="date" id="swal-mulai" class="form-control form-control-sm"></div>
                    <div class="col-6"><label class="fw-bold small">Berakhir</label><input type="date" id="swal-akhir" class="form-control form-control-sm"></div>
                </div>
                <div class="mb-2">
                    <label class="fw-bold small">Nomor Berita Acara (BA)</label>
                    <input type="text" id="swal-ba" class="form-control form-control-sm" placeholder="Misal: 4662/PT.04.05.06/Mektan">
                </div>
                <hr class="my-2">
                <div class="mb-2">
                    <label class="fw-bold small text-primary">Nama Peminjam</label>
                    <input type="text" id="swal-nama" class="form-control form-control-sm" placeholder="Nama lengkap">
                </div>
                <div class="row g-2 mb-2">
                    <div class="col-6"><label class="fw-bold small text-primary">Jabatan</label><input type="text" id="swal-jabatan" class="form-control form-control-sm" placeholder="Misal: Ketua"></div>
                    <div class="col-6"><label class="fw-bold small text-primary">No. HP/WA</label><input type="text" id="swal-kontak" class="form-control form-control-sm" placeholder="08..."></div>
                </div>
                <div class="mb-2">
                    <label class="fw-bold small text-primary">Nama Kelompok Tani / UPJA</label>
                    <input type="text" id="swal-poktan" class="form-control form-control-sm">
                </div>
                <hr class="my-2">
                <div class="row g-2 mb-2">
                    <div class="col-4"><label class="fw-bold small text-success">Desa</label><input type="text" id="swal-desa" class="form-control form-control-sm"></div>
                    <div class="col-4"><label class="fw-bold small text-success">Kecamatan</label><input type="text" id="swal-kec" class="form-control form-control-sm"></div>
                    <div class="col-4"><label class="fw-bold small text-success">Kabupaten</label><input type="text" id="swal-kab" class="form-control form-control-sm"></div>
                </div>
                <div class="mb-1">
                    <label class="fw-bold small">Estimasi Biaya Jasa (Rp)</label>
                    <input type="number" id="swal-biaya" class="form-control form-control-sm" placeholder="0">
                </div>
            </div>
        `,
        width: '600px',
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Keluarkan Barang',
        cancelButtonText: 'Batal',
        preConfirm: () => {
            const data = {
                alsintan_id: id,
                tanggal_mulai: document.getElementById('swal-mulai').value,
                tanggal_berakhir: document.getElementById('swal-akhir').value,
                nomor_ba: document.getElementById('swal-ba').value,
                nama_peminjam: document.getElementById('swal-nama').value,
                jabatan_peminjam: document.getElementById('swal-jabatan').value,
                kontak_peminjam: document.getElementById('swal-kontak').value,
                nama_kelompok: document.getElementById('swal-poktan').value,
                desa: document.getElementById('swal-desa').value,
                kecamatan: document.getElementById('swal-kec').value,
                kabupaten: document.getElementById('swal-kab').value,
                biaya_jasa: document.getElementById('swal-biaya').value || 0
            };
            
            if(!data.tanggal_mulai || !data.tanggal_berakhir || !data.nama_peminjam) {
                Swal.showValidationMessage('Tanggal dan Nama Peminjam wajib diisi!');
            }
            return data;
        }
    });

    if (formValues) {
        try {
            Swal.fire({ title: 'Menyimpan Transaksi...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            
            await axios.post(`${API_BASE_URL}/peminjaman/admin-pinjam`, formValues);
            
            Swal.fire('Berhasil!', 'Barang telah dikeluarkan dari balai.', 'success');
            fetchDetail(); // Refresh data
        } catch (error) {
            Swal.fire('Gagal', 'Terjadi kesalahan server.', 'error');
        }
    }
};

const handleSelesaikan = async () => {
    const confirm = await Swal.fire({
        title: 'Selesaikan Peminjaman?',
        text: "Traktor ini akan dikembalikan ke balai dan statusnya menjadi Tersedia.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, Alat Sudah Kembali',
        cancelButtonColor: '#d33'
    });

    if (confirm.isConfirmed) {
        try {
            await axios.post(`${API_BASE_URL}/peminjaman/selesai/${transaksiAktif.value.id_transaksi}`, { alsintan_id: id });
            Swal.fire('Selesai', 'Peminjaman telah diselesaikan.', 'success');
            fetchDetail();
        } catch (error) {
            Swal.fire('Gagal', 'Tidak dapat menyelesaikan transaksi.', 'error');
        }
    }
};

const lihatSuratJalan = (tx) => {
    const qrData = `BA:${tx.nomor_ba} | Alat:${item.value.nama_alat} | Peminjam:${tx.nama_peminjam}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

    Swal.fire({
        title: 'Surat Jalan Digital',
        html: `
            <div class="text-center">
                <img src="${qrUrl}" class="border p-2 rounded shadow-sm mb-3" alt="QR Code Surat Jalan">
                <div class="bg-light p-2 rounded text-start small border border-primary border-opacity-25">
                    <b>No. BA:</b> ${tx.nomor_ba}<br>
                    <b>Peminjam:</b> ${tx.nama_peminjam}<br>
                    <b>Instansi/UPJA:</b> ${tx.nama_kelompok || '-'}<br>
                    <b>Jatuh Tempo:</b> ${new Date(tx.tanggal_berakhir).toLocaleDateString('id-ID')}
                </div>
            </div>
        `,
        confirmButtonText: 'Tutup',
        confirmButtonColor: '#0d6efd'
    });
};
</script>

<template>
    <div class="container-fluid pb-5">
        
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h3 class="fw-bolder text-dark mb-0">Detail Alat Mesin Pertanian</h3>
                <small class="text-muted">Melihat spesifikasi, status, dan riwayat peminjaman.</small>
            </div>
            <button @click="router.back()" class="btn btn-outline-secondary shadow-sm fw-bold">
                <i class="bi bi-arrow-left"></i> Kembali
            </button>
        </div>

        <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2 fw-bold text-muted">Memuat data...</p>
        </div>

        <div v-else-if="item" class="row g-4">
            
            <div class="col-lg-7 col-xl-8">
                <div class="card border-0 shadow-sm h-100 overflow-hidden">
                    <div class="row g-0 h-100">
                        <div class="col-md-5 bg-light d-flex align-items-center justify-content-center p-3 border-end">
                            <img :src="item.gambar && item.gambar.startsWith('http') ? item.gambar : `${IMAGE_BASE_URL}/${item.gambar}`" 
                                 class="img-fluid rounded shadow-sm object-fit-cover w-100" 
                                 style="max-height: 250px;"
                                 @error="$event.target.src='https://via.placeholder.com/400x300?text=No+Image'">
                        </div>
                        <div class="col-md-7">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <div>
                                        <h4 class="fw-bold mb-1">{{ item.nama_alat }}</h4>
                                        <span class="badge border border-primary text-primary px-3 py-1">{{ item.kode_perangkat }}</span>
                                    </div>
                                    <span class="badge px-3 py-2" :class="getKondisiBadge(item.kondisi_fisik)">
                                        <i class="bi bi-wrench-adjustable-circle me-1"></i> {{ item.kondisi_fisik || 'Baik' }}
                                    </span>
                                </div>
                                
                                <hr class="my-3">
                                
                                <!-- [DIPERBARUI] Grid Spesifikasi Menampilkan Seluruh Data Lengkap -->
                                <div class="row g-3">
                                    <div class="col-6">
                                        <small class="text-muted d-block fw-bold">Kode Unit</small>
                                        <span class="fw-bold text-dark">{{ item.kode_unit || '-' }}</span>
                                    </div>
                                    <div class="col-6">
                                        <small class="text-muted d-block fw-bold">Kategori</small>
                                        <span class="fw-bold text-dark">{{ item.kategori_alat || '-' }}</span>
                                    </div>
                                    <div class="col-6">
                                        <small class="text-muted d-block fw-bold">Merek / Tipe</small>
                                        <span class="fw-bold text-dark">{{ item.merk_alat || '-' }}</span>
                                    </div>
                                    <div class="col-6">
                                        <small class="text-muted d-block fw-bold">No. Mesin</small>
                                        <span class="fw-bold text-dark">{{ item.nomor_mesin || '-' }}</span>
                                    </div>
                                    <div class="col-6">
                                        <small class="text-muted d-block fw-bold">No. Rangka / Seri</small>
                                        <span class="fw-bold text-dark">{{ item.nomor_seri || '-' }}</span>
                                    </div>
                                    <div class="col-6">
                                        <small class="text-muted d-block fw-bold">Tahun Penerimaan</small>
                                        <span class="fw-bold text-dark">{{ item.tahun_penerimaan || 'Belum Diatur' }}</span>
                                    </div>
                                    <div class="col-6">
                                        <small class="text-muted d-block fw-bold">Kapasitas Lahan</small>
                                        <span class="fw-bold text-dark">{{ item.kapasitas_lahan || '-' }} Ha/Hari</span>
                                    </div>
                                    <div class="col-6">
                                        <small class="text-muted d-block fw-bold">Lebar Implemen</small>
                                        <span class="fw-bold text-dark">{{ item.lebar_implemen }} Meter</span>
                                    </div>
                                </div>

                                <div class="mt-4 bg-light p-3 rounded border">
                                    <small class="fw-bold text-muted d-block mb-1">Catatan Balai:</small>
                                    <p class="mb-0 small" style="white-space: pre-line;">{{ item.deskripsi || 'Tidak ada catatan.' }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-lg-5 col-xl-4">
                
                <div v-if="item.status_ketersediaan === 'Tersedia di Balai'" class="card border-0 shadow-sm h-100 bg-success bg-opacity-10 border border-success">
                    <div class="card-body text-center d-flex flex-column justify-content-center p-4">
                        <i class="bi bi-building-check text-success" style="font-size: 4rem;"></i>
                        <h4 class="fw-bold text-success mt-3 mb-1">TERSEDIA DI BALAI</h4>
                        <p class="text-muted small mb-4">Alat ini siap beroperasi dan dapat dipinjamkan ke kelompok tani.</p>
                        
                        <button v-if="userRole === 'mektan'" @click="handlePinjamkan" class="btn btn-success fw-bold py-2 w-100 shadow-sm mt-auto">
                            <i class="bi bi-file-earmark-plus"></i> Keluarkan Surat Pinjam
                        </button>
                    </div>
                </div>

                <div v-else-if="item.status_ketersediaan === 'Sedang Dipinjam'" class="card border-0 shadow-sm h-100 border border-warning" style="background-color: #fffdf2;">
                    <div class="card-header bg-warning text-dark py-3">
                        <h6 class="mb-0 fw-bold text-center"><i class="bi bi-exclamation-triangle-fill me-2"></i>ALAT SEDANG DIPINJAM</h6>
                    </div>
                    <div class="card-body">
                        <div v-if="transaksiAktif">
                            <div class="mb-3 text-center border-bottom pb-3">
                                <small class="text-muted d-block text-uppercase fw-bold">Nomor Berita Acara (BA)</small>
                                <span class="fs-5 fw-bolder">{{ transaksiAktif.nomor_ba || '-' }}</span>
                            </div>

                            <div class="d-flex align-items-center mb-3">
                                <div class="bg-warning bg-opacity-25 p-2 rounded text-warning me-3"><i class="bi bi-person-fill fs-4"></i></div>
                                <div>
                                    <h6 class="fw-bold mb-0">{{ transaksiAktif.nama_peminjam }}</h6>
                                    <small class="text-muted">{{ transaksiAktif.jabatan_peminjam }} - {{ transaksiAktif.nama_kelompok }}</small>
                                </div>
                            </div>

                            <div class="d-flex align-items-center mb-3">
                                <div class="bg-warning bg-opacity-25 p-2 rounded text-warning me-3"><i class="bi bi-geo-alt-fill fs-4"></i></div>
                                <div>
                                    <h6 class="fw-bold mb-0">Lokasi Operasional</h6>
                                    <small class="text-muted">Ds. {{ transaksiAktif.desa }}, Kec. {{ transaksiAktif.kecamatan }}, {{ transaksiAktif.kabupaten }}</small>
                                </div>
                            </div>

                            <div class="bg-white rounded border p-3 mb-4 shadow-sm">
                                <div class="d-flex justify-content-between mb-2">
                                    <small class="text-muted fw-bold">Mulai Pinjam:</small>
                                    <small class="fw-bold text-dark">{{ new Date(transaksiAktif.tanggal_mulai).toLocaleDateString('id-ID') }}</small>
                                </div>
                                <div class="d-flex justify-content-between">
                                    <small class="text-danger fw-bold">Jatuh Tempo:</small>
                                    <small class="fw-bold text-danger">{{ new Date(transaksiAktif.tanggal_berakhir).toLocaleDateString('id-ID') }}</small>
                                </div>
                            </div>
                            
                            <button v-if="userRole" @click="lihatSuratJalan(transaksiAktif)" class="btn btn-outline-primary w-100 fw-bold py-2 shadow-sm mb-2">
                                <i class="bi bi-qr-code-scan"></i> Lihat Surat Jalan (QR)
                            </button>
                            
                            <button v-if="userRole === 'mektan'" @click="handleSelesaikan" class="btn btn-warning w-100 fw-bold py-2 shadow-sm mt-auto">
                                <i class="bi bi-check-circle-fill"></i> Alat Selesai & Kembali
                            </button>
                        </div>
                        <div v-else class="text-center py-5">
                            <div class="spinner-border text-warning mb-2" role="status"></div>
                            <small class="d-block text-muted">Memuat data surat jalan...</small>
                        </div>
                    </div>
                </div>

                <div v-else class="card border-0 shadow-sm h-100 bg-secondary bg-opacity-10 border border-secondary">
                    <div class="card-body text-center d-flex flex-column justify-content-center p-4">
                        <i class="bi bi-cone-striped text-secondary" style="font-size: 4rem;"></i>
                        <h4 class="fw-bold text-secondary mt-3 mb-1 text-uppercase">{{ item.status_ketersediaan }}</h4>
                        <p class="text-muted small">Alat tidak dapat dipinjamkan pada status ini. Silakan ubah melalui menu Edit Aset.</p>
                    </div>
                </div>

            </div>
        </div>

    </div>
</template>