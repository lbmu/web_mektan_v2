<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useRoute, useRouter } from 'vue-router';
import Swal from 'sweetalert2';

const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL;
const route = useRoute();
const router = useRouter();
const id = route.params.id; 

const form = ref({
  kode_perangkat: '',
  nama_alat: '',
  kategori_alat: '',
  merk_alat: '',
  nomor_seri: '',
  status_sensor: 'Normal',
  status_operasional: 'Siap Digunakan',
  deskripsi: '',
  kapasitas_lahan: '',
  lebar_implemen: 0
});

const fileGambar = ref(null);
const previewGambar = ref(null);
const gambarLama = ref(''); 
const isSubmitting = ref(false);
const isLoading = ref(true);

// SMART REGEX
const formatKodePerangkat = () => {
    form.value.kode_perangkat = form.value.kode_perangkat.toUpperCase().replace(/[^A-Z0-9-]/g, '');
};

const fetchDetail = async () => {
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/alsintan/${id}`);
    const data = response.data;
    
    form.value = {
        kode_perangkat: data.kode_perangkat,
        nama_alat: data.nama_alat,
        kategori_alat: data.kategori_alat,
        merk_alat: data.merk_alat,
        nomor_seri: data.nomor_seri,
        status_sensor: data.status_sensor,
        status_operasional: data.status_operasional,
        deskripsi: data.deskripsi,
        kapasitas_lahan: data.kapasitas_lahan,
        lebar_implemen: data.lebar_implemen || 1.89 // Ambil dari DB atau fallback ke 1.89
    };
    
    gambarLama.value = data.gambar;
  } catch (error) {
    Swal.fire('Error', 'Gagal mengambil data aset.', 'error');
    router.push('/aset');
  } finally {
    isLoading.value = false;
  }
};

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (file) {
    fileGambar.value = file;
    previewGambar.value = URL.createObjectURL(file);
  }
};

const submitForm = async () => {
  isSubmitting.value = true;
  
  // Animasi Loading SweetAlert
  Swal.fire({
      title: 'Memperbarui Aset...',
      text: 'Menyinkronkan data ke server.',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
  });

  try {
    const formData = new FormData();
    formData.append('kode_perangkat', form.value.kode_perangkat);
    formData.append('nama_alat', form.value.nama_alat);
    formData.append('kategori_alat', form.value.kategori_alat);
    formData.append('merk_alat', form.value.merk_alat);
    formData.append('nomor_seri', form.value.nomor_seri);
    formData.append('status_sensor', form.value.status_sensor);
    formData.append('status_operasional', form.value.status_operasional);
    formData.append('deskripsi', form.value.deskripsi);
    formData.append('kapasitas_lahan', form.value.kapasitas_lahan);
    formData.append('lebar_implemen', form.value.lebar_implemen);

    if (fileGambar.value) {
      formData.append('gambar', fileGambar.value);
    }

    await axios.put(`${import.meta.env.VITE_API_BASE_URL}/alsintan/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    // Animasi Sukses
    Swal.fire({
        icon: 'success',
        title: 'Diperbarui!',
        text: 'Data aset berhasil diperbarui.',
        confirmButtonColor: '#198754'
    }).then(() => {
        router.push(`/aset/${id}`); 
    });

  } catch (error) {
    console.error("Gagal update:", error);
    Swal.fire('Gagal!', 'Terjadi kesalahan saat menyimpan perubahan.', 'error');
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  fetchDetail();
});
</script>

<template>
  <div class="container-fluid pb-4">
    
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h2 class="fw-bold text-dark mb-0">✏️ Edit Aset</h2>
      <button @click="router.back()" class="btn btn-outline-secondary shadow-sm">
        <i class="bi bi-arrow-left"></i> Kembali
      </button>
    </div>

    <div v-if="isLoading" class="text-center py-5">
        <div class="spinner-border text-primary"></div>
        <p class="mt-2 text-muted fw-bold">Memuat konfigurasi alat...</p>
    </div>

    <div v-else class="card border-0 shadow-sm">
      <div class="card-body p-4">
        
        <form @submit.prevent="submitForm">
          <div class="row g-4">
            
            <div class="col-md-6 border-end pe-md-4">
              <h5 class="text-primary mb-3 fw-bold"><i class="bi bi-cpu me-2"></i>Informasi Perangkat</h5>
              
              <div class="mb-3">
                <label class="form-label fw-bold">Kode Perangkat (ID IoT)</label>
                <input v-model="form.kode_perangkat" @input="formatKodePerangkat" type="text" class="form-control bg-light text-primary fw-bold" required>
              </div>

              <div class="mb-3">
                <label class="form-label fw-bold">Nama Alat</label>
                <input v-model="form.nama_alat" type="text" class="form-control" required>
              </div>

              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label">Kategori</label>
                  <select v-model="form.kategori_alat" class="form-select">
                    <option value="Traktor">Traktor</option>
                    <option value="Combine Harvester">Combine Harvester</option>
                    <option value="Transplanter">Transplanter</option>
                    <option value="Pompa Air">Pompa Air</option>
                    <option value="Drone">Drone Pertanian</option>
                  </select>
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label">Merk</label>
                  <input v-model="form.merk_alat" type="text" class="form-control">
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Nomor Seri</label>
                <input v-model="form.nomor_seri" type="text" class="form-control">
              </div>
            </div>

            <div class="col-md-6 ps-md-4">
              <h5 class="text-primary mb-3 fw-bold"><i class="bi bi-sliders me-2"></i>Status & Konfigurasi</h5>

              <div class="mb-3">
                  <label class="form-label">Status Operasional (Fisik)</label>
                  <select v-model="form.status_operasional" class="form-select fw-bold bg-light text-dark">
                    <option value="Siap Digunakan">🟢 Siap Digunakan</option>
                    <option value="Sedang Beroperasi">🔵 Sedang Beroperasi</option>
                    <option value="Maintenance">🟠 Maintenance</option>
                    <option value="Rusak">🔴 Rusak</option>
                  </select>
              </div>

              <div class="row">
                  <div class="col-md-6 mb-3">
                      <label class="form-label text-muted small fw-bold">Kapasitas Cakupan Lahan</label>
                      <div class="input-group">
                          <input v-model="form.kapasitas_lahan" type="number" step="0.1" class="form-control">
                          <span class="input-group-text bg-light text-muted">Ha / Hari</span>
                      </div>
                  </div>

                  <div class="col-md-6 mb-3">
                      <label class="form-label text-primary small fw-bold">Lebar Implemen / Bajak</label>
                      <div class="input-group border-primary rounded">
                          <input v-model="form.lebar_implemen" type="number" step="0.01" class="form-control border-primary">
                          <span class="input-group-text bg-primary text-white border-primary">Meter</span>
                      </div>
                      <div class="form-text small" style="font-size: 10px;">*Untuk kalkulasi argo GPS</div>
                  </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Foto Alat <span class="text-muted small fw-normal">(Biarkan kosong jika tidak diganti)</span></label>
                <input @change="handleFileUpload" type="file" class="form-control" accept="image/*">
                
                <div class="mt-3 text-center rounded p-3 position-relative" style="border: 2px dashed #dee2e6; background-color: #f8f9fa;">
                  <span class="badge bg-secondary position-absolute top-0 start-0 m-2">Preview Gambar</span>
                  <img v-if="previewGambar" :src="previewGambar" class="img-fluid rounded shadow-sm mt-3" style="max-height: 160px;">
                  <img v-else-if="gambarLama" :src="`${IMAGE_BASE_URL}/${gambarLama}`" class="img-fluid rounded shadow-sm mt-3" style="max-height: 160px;" @error="$event.target.style.display='none'">
                  <div v-else class="text-muted py-3 mt-3">
                      <i class="bi bi-camera fs-1 d-block mb-1 opacity-50"></i>
                      <small>Belum ada foto</small>
                  </div>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Deskripsi</label>
                <textarea v-model="form.deskripsi" class="form-control" rows="2"></textarea>
              </div>
            </div>

          </div>

          <div class="d-flex justify-content-end mt-4 pt-3 border-top bg-white">
            <button type="button" @click="router.back()" class="btn btn-light border me-2 px-4 text-muted">Batal</button>
            <button type="submit" class="btn btn-primary px-5 fw-bold shadow-sm" :disabled="isSubmitting">
              <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2"></span>
              {{ isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan' }}
            </button>
          </div>

        </form>

      </div>
    </div>
  </div>
</template>