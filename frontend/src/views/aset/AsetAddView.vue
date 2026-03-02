<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const router = useRouter();

const form = ref({
    kode_perangkat: '',
    nama_alat: '',
    kategori_alat: '',
    merk_alat: '',
    nomor_seri: '',          
    status_sensor: 'Normal',  // Default Normal
    status_operasional: 'Siap Digunakan',
    deskripsi: '',
    kapasitas_lahan: ''
});

// State untuk file gambar
const fileGambar = ref(null);
const previewGambar = ref(null);
const isSubmitting = ref(false);

// 2. HANDLER UPLOAD GAMBAR
const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
        fileGambar.value = file;
        previewGambar.value = URL.createObjectURL(file);
    }
};

// 3. KIRIM DATA KE BACKEND
const submitForm = async () => {
    isSubmitting.value = true;

    try {
        // Karena ada upload file, kita WAJIB pakai FormData
        const formData = new FormData();
    
        // Masukkan semua data teks ke formData
        formData.append('kode_perangkat', form.value.kode_perangkat);
        formData.append('nama_alat', form.value.nama_alat);
        formData.append('kategori_alat', form.value.kategori_alat);
        formData.append('merk_alat', form.value.merk_alat);
        formData.append('nomor_seri', form.value.nomor_seri);
        formData.append('status_sensor', form.value.status_sensor);
        formData.append('status_operasional', form.value.status_operasional);
        formData.append('deskripsi', form.value.deskripsi);
        formData.append('kapasitas_lahan', form.value.kapasitas_lahan);

        // Masukkan file gambar jika ada
        if (fileGambar.value) {
            formData.append('gambar', fileGambar.value);
        }

    // Kirim ke Backend
    await axios.post(`${import.meta.env.VITE_API_BASE_URL}/alsintan`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });

    // Jika sukses, kembali ke halaman list
    alert('Berhasil menambahkan aset baru!');
    router.push('/aset');

    } catch (error) {
        console.error("Gagal upload:", error);
        alert('Terjadi kesalahan saat menyimpan data. Cek console.');
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<template>
    <div class="container-fluid">
    
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2 class="fw-bold text-dark mb-0">➕ Tambah Aset Baru</h2>
            <button @click="router.back()" class="btn btn-secondary">
                <i class="bi bi-arrow-left"></i> Kembali
            </button>
        </div>

        <div class="card border-0 shadow-sm">
            <div class="card-body p-4">
        
                <form @submit.prevent="submitForm">
                    <div class="row g-3">
            
                        <div class="col-md-6">
                            <h5 class="text-primary mb-3">Informasi Perangkat</h5>

                            <div class="mb-3">
                                <label class="form-label fw-bold">Kode Perangkat <span class="text-danger">*</span></label>
                                <input v-model="form.kode_perangkat" type="text" class="form-control" placeholder="Contoh: IOT-TR-01" required>
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
                                        <option value="Traktor">Traktor</option>
                                        <option value="Combine Harvester">Combine Harvester</option>
                                        <option value="Transplanter">Transplanter</option>
                                        <option value="Pompa Air">Pompa Air</option>
                                        <option value="Drone">Drone Pertanian</option>
                                    </select>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Merk / Brand</label>
                                    <input v-model="form.merk_alat" type="text" class="form-control" placeholder="Contoh: Kubota">
                                </div>
                            </div>

                            <div class="mb-3">
                                <label class="form-label">Nomor Seri</label>
                                <input v-model="form.nomor_seri" type="text" class="form-control" placeholder="No. Seri Mesin/Rangka">
                            </div>
                        </div>

                        <div class="col-md-6">
                            <h5 class="text-primary mb-3">Status & Detail</h5>

                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Status Operasional (Fisik)</label>
                                    <select v-model="form.status_operasional" class="form-select bg-light fw-bold text-dark">
                                        <option value="Siap Digunakan">Siap Digunakan</option>
                                        <option value="Sedang Beroperasi">Sedang Beroperasi</option>
                                        <option value="Maintenance">Maintenance</option>
                                        <option value="Rusak">Rusak</option>
                                    </select>
                                    <div class="form-text">Status kondisi fisik alat (Administratif).</div>
                                </div>

                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Kapasitas / Cakupan Lahan</label>
                                    <input v-model="form.kapasitas_lahan" type="text" class="form-control" placeholder="Contoh: 5 Ha / Hari">
                                </div>
                            </div>

                            <div class="mb-3">
                                <label class="form-label">Foto Alat</label>
                                <input @change="handleFileUpload" type="file" class="form-control" accept="image/*">
                                <div v-if="previewGambar" class="mt-2 text-center border rounded p-2 bg-light">
                                    <img :src="previewGambar" alt="Preview" class="img-fluid" style="max-height: 150px;">
                                </div>
                            </div>

                            <div class="mb-3">
                                <label class="form-label">Deskripsi Tambahan</label>
                                <textarea v-model="form.deskripsi" class="form-control" rows="3" placeholder="Keterangan kondisi alat..."></textarea>
                            </div>
                        </div>

                    </div>

                    <div class="d-flex justify-content-end mt-4 pt-3 border-top">
                        <button type="button" @click="router.back()" class="btn btn-light border me-2">Batal</button>
                        <button type="submit" class="btn btn-primary px-4 fw-bold" :disabled="isSubmitting">
                            <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2"></span>
                            {{ isSubmitting ? 'Menyimpan...' : 'Simpan Aset' }}
                        </button>
                    </div>

                </form>

            </div>
        </div>
    </div>
</template>