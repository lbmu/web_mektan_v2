<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import Swal from 'sweetalert2';

const router = useRouter();

// [DIPERBARUI] Menambahkan kode_unit dan nomor_mesin
const form = ref({
    kode_perangkat: '',
    kode_unit: '',
    nama_alat: '',
    kategori_alat: '',
    merk_alat: '',
    nomor_mesin: '',
    nomor_seri: '',
    tahun_penerimaan: '', 
    status_sensor: 'Normal',
    status_operasional: 'Siap Digunakan',
    kondisi_fisik: 'Baik', 
    deskripsi: '',
    kapasitas_lahan: '',
    lebar_implemen: 1.89
});

const fileGambar = ref(null);
const previewGambar = ref(null);
const isSubmitting = ref(false);

const fileInputRef = ref(null);

const formatKodePerangkat = () => {
    form.value.kode_perangkat = form.value.kode_perangkat.toUpperCase().replace(/[^A-Z0-9-]/g, '');
};

const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
        fileGambar.value = file;
        previewGambar.value = URL.createObjectURL(file);
    }
};

const hapusFoto = () => {
    fileGambar.value = null;
    previewGambar.value = null;
    if (fileInputRef.value) {
        fileInputRef.value.value = ''; 
    }
};

const submitForm = async () => {
    isSubmitting.value = true;

    Swal.fire({
        title: 'Menyimpan Aset...',
        text: 'Mohon tunggu sistem sedang mengunggah data.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const formData = new FormData();
        formData.append('kode_perangkat', form.value.kode_perangkat);
        // [DIPERBARUI] Menambahkan kode_unit dan nomor_mesin ke payload
        formData.append('kode_unit', form.value.kode_unit);
        formData.append('nama_alat', form.value.nama_alat);
        formData.append('kategori_alat', form.value.kategori_alat);
        formData.append('merk_alat', form.value.merk_alat);
        formData.append('nomor_mesin', form.value.nomor_mesin);
        formData.append('nomor_seri', form.value.nomor_seri);
        formData.append('tahun_penerimaan', form.value.tahun_penerimaan); 
        formData.append('kondisi_fisik', form.value.kondisi_fisik); 
        formData.append('status_sensor', form.value.status_sensor);
        formData.append('status_operasional', form.value.status_operasional);
        formData.append('deskripsi', form.value.deskripsi);
        formData.append('kapasitas_lahan', form.value.kapasitas_lahan);
        formData.append('lebar_implemen', form.value.lebar_implemen);

        if (fileGambar.value) {
            formData.append('gambar', fileGambar.value);
        }

        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/alsintan`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        Swal.fire({
            icon: 'success',
            title: 'Berhasil!',
            text: 'Aset baru berhasil ditambahkan ke dalam sistem.',
            confirmButtonColor: '#198754'
        }).then(() => {
            router.push('/aset');
        });

    } catch (error) {
        console.error("Gagal upload:", error);
        Swal.fire({
            icon: 'error',
            title: 'Gagal Menyimpan',
            text: 'Terjadi kesalahan pada server. Pastikan kode perangkat belum digunakan.',
            confirmButtonColor: '#dc3545'
        });
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<template>
    <div class="container-fluid pb-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2 class="fw-bold text-dark mb-0">➕ Tambah Aset Baru</h2>
            <button @click="router.back()" class="btn btn-outline-secondary shadow-sm">
                <i class="bi bi-arrow-left"></i> Kembali
            </button>
        </div>

        <div class="card border-0 shadow-sm">
            <div class="card-body p-4">
                <form @submit.prevent="submitForm">
                    <div class="row g-4">
                        <div class="col-md-6 border-end pe-md-4">
                            <h5 class="text-primary mb-3 fw-bold"><i class="bi bi-cpu me-2"></i>Informasi Perangkat</h5>

                            <!-- [DIPERBARUI] Baris ID IoT disejajarkan dengan Kode Unit -->
                            <div class="row">
                                <div class="col-md-7 mb-3">
                                    <label class="form-label fw-bold">Kode Perangkat (ID IoT) <span class="text-danger">*</span></label>
                                    <input v-model="form.kode_perangkat" @input="formatKodePerangkat" type="text" class="form-control bg-light text-primary fw-bold" placeholder="Contoh: IOT-TR-01" required>
                                </div>
                                <div class="col-md-5 mb-3">
                                    <label class="form-label fw-bold text-success">Kode Unit Aset</label>
                                    <input v-model="form.kode_unit" type="text" class="form-control border-success" placeholder="Misal: TR-001">
                                </div>
                            </div>

                            <div class="mb-3">
                                <label class="form-label fw-bold">Nama Alat <span class="text-danger">*</span></label>
                                <input v-model="form.nama_alat" type="text" class="form-control" placeholder="Contoh: Traktor Roda 4" required>
                            </div>

                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Kategori</label>
                                    <select v-model="form.kategori_alat" class="form-select">
                                        <option value="">Pilih Kategori...</option>
                                        <option value="Traktor Roda 4">Traktor Roda 4</option>
                                        <option value="Traktor Roda 2">Traktor Roda 2</option>
                                        <option value="Combine Harvester">Combine Harvester</option>
                                        <option value="Excavator">Excavator</option>
                                        <option value="Rotavator">Rotavator</option>
                                        <option value="Cultivator">Cultivator</option>
                                        <option value="Pompa Air">Pompa Air</option>
                                        <option value="Drone">Drone Pertanian</option>
                                    </select>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Merk / Type</label>
                                    <input v-model="form.merk_alat" type="text" class="form-control" placeholder="Contoh: KIOTI DK 4510">
                                </div>
                            </div>

                            <!-- [DIPERBARUI] Baris ini memuat No Mesin, No Rangka, dan Tahun -->
                            <div class="row">
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">No. Mesin</label>
                                    <input v-model="form.nomor_mesin" type="text" class="form-control" placeholder="Misal: M1234">
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">No. Rangka (Seri)</label>
                                    <input v-model="form.nomor_seri" type="text" class="form-control" placeholder="Misal: R9876">
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label class="form-label fw-bold text-primary">Tahun Terima</label>
                                    <input v-model="form.tahun_penerimaan" type="number" class="form-control border-primary" placeholder="2025" min="1990" max="2100">
                                </div>
                            </div>
                        </div>

                        <div class="col-md-6 ps-md-4">
                            <h5 class="text-primary mb-3 fw-bold"><i class="bi bi-sliders me-2"></i>Status & Detail</h5>

                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Status Penugasan</label>
                                    <select v-model="form.status_operasional" class="form-select bg-light fw-bold text-dark">
                                        <option value="Siap Digunakan">🟢 Siap Digunakan</option>
                                        <option value="Sedang Beroperasi">🔵 Sedang Beroperasi</option>
                                        <option value="Maintenance">🟠 Maintenance</option>
                                    </select>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label text-danger fw-bold">Kondisi Fisik Alat</label>
                                    <select v-model="form.kondisi_fisik" class="form-select border-danger">
                                        <option value="Baik">👍 Kondisi Baik</option>
                                        <option value="Rusak Ringan">⚠️ Rusak Ringan</option>
                                        <option value="Rusak Berat">🛠️ Rusak Berat</option>
                                    </select>
                                </div>
                            </div>

                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label text-muted small fw-bold">Kapasitas Cakupan Lahan</label>
                                    <div class="input-group">
                                        <input v-model="form.kapasitas_lahan" type="number" step="0.1" class="form-control" placeholder="Misal: 5">
                                        <span class="input-group-text bg-light text-muted">Ha/Hari</span>
                                    </div>
                                </div>

                                <div class="col-md-6 mb-3">
                                    <label class="form-label text-primary small fw-bold">Lebar Implemen / Bajak</label>
                                    <div class="input-group border-primary rounded">
                                        <input v-model="form.lebar_implemen" type="number" step="0.01" class="form-control border-primary" placeholder="Misal: 1.89">
                                        <span class="input-group-text bg-primary text-white border-primary">Meter</span>
                                    </div>
                                </div>
                            </div>

                            <div class="mb-3">
                                <label class="form-label">Foto Alat</label>
                                <input ref="fileInputRef" @change="handleFileUpload" type="file" class="form-control" accept="image/*">
                                
                                <div class="mt-3 text-center rounded p-3" style="border: 2px dashed #dee2e6; background-color: #f8f9fa;">
                                    <div v-if="previewGambar" class="position-relative d-inline-block">
                                        <img :src="previewGambar" alt="Preview" class="img-fluid rounded shadow-sm" style="max-height: 180px;">
                                        <button @click="hapusFoto" type="button" class="btn btn-sm btn-danger position-absolute top-0 start-100 translate-middle rounded-circle shadow" style="width: 28px; height: 28px; padding: 0;" title="Hapus foto">
                                            <i class="bi bi-x-lg" style="font-size: 12px;"></i>
                                        </button>
                                    </div>
                                    <div v-else class="text-muted py-3">
                                        <i class="bi bi-camera fs-1 d-block mb-1 opacity-50"></i>
                                        <small>Belum ada foto yang dipilih</small>
                                    </div>
                                </div>
                            </div>

                            <div class="mb-3">
                                <label class="form-label">Deskripsi Tambahan</label>
                                <textarea v-model="form.deskripsi" class="form-control" rows="2" placeholder="Keterangan lain..."></textarea>
                            </div>
                        </div>
                    </div>

                    <div class="d-flex justify-content-end mt-4 pt-3 border-top bg-white">
                        <button type="button" @click="router.back()" class="btn btn-light border me-2 px-4 text-muted">Batal</button>
                        <button type="submit" class="btn btn-primary px-5 fw-bold shadow-sm" :disabled="isSubmitting">
                            <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2"></span>
                            {{ isSubmitting ? 'Menyimpan...' : 'Simpan Aset Baru' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>