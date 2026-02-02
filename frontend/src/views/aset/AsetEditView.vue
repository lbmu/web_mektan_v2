<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const id = route.params.id; // Ambil ID dari URL

// State Form
const form = ref({
  kode_perangkat: '',
  nama_alat: '',
  kategori_alat: '',
  merk_alat: '',
  nomor_seri: '',
  status: 'OFF',
  status_sensor: 'Normal',
  status_operasional: 'Siap Digunakan',
  deskripsi: '',
  kapasitas_lahan: ''
});

// State Pendukung
const fileGambar = ref(null);
const previewGambar = ref(null);
const gambarLama = ref(''); // Untuk menampilkan gambar saat ini
const isSubmitting = ref(false);
const isLoading = ref(true);

// 1. AMBIL DATA LAMA (Saat halaman dibuka)
const fetchDetail = async () => {
  try {
    const response = await axios.get(`http://localhost:3000/api/alsintan/${id}`);
    const data = response.data;
    
    // Isi form dengan data dari database
    form.value = {
        kode_perangkat: data.kode_perangkat,
        nama_alat: data.nama_alat,
        kategori_alat: data.kategori_alat,
        merk_alat: data.merk_alat,
        nomor_seri: data.nomor_seri,
        status: data.status,
        status_sensor: data.status_sensor,
        status_operasional: data.status_operasional,
        deskripsi: data.deskripsi,
        kapasitas_lahan: data.kapasitas_lahan
    };
    
    // Simpan nama gambar lama untuk preview
    gambarLama.value = data.gambar;
    
  } catch (error) {
    alert("Gagal mengambil data aset.");
    router.push('/aset');
  } finally {
    isLoading.value = false;
  }
};

// 2. HANDLER GANTI GAMBAR
const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (file) {
    fileGambar.value = file;
    previewGambar.value = URL.createObjectURL(file);
  }
};

// 3. KIRIM PERUBAHAN (UPDATE)
const submitForm = async () => {
  isSubmitting.value = true;
  try {
    const formData = new FormData();
    
    // Masukkan semua data teks
    formData.append('kode_perangkat', form.value.kode_perangkat);
    formData.append('nama_alat', form.value.nama_alat);
    formData.append('kategori_alat', form.value.kategori_alat);
    formData.append('merk_alat', form.value.merk_alat);
    formData.append('nomor_seri', form.value.nomor_seri);
    formData.append('status', form.value.status);
    formData.append('status_sensor', form.value.status_sensor);
    formData.append('status_operasional', form.value.status_operasional);
    formData.append('deskripsi', form.value.deskripsi);
    formData.append('kapasitas_lahan', form.value.kapasitas_lahan);

    // Hanya kirim gambar jika user memilih file baru
    if (fileGambar.value) {
      formData.append('gambar', fileGambar.value);
    }

    // PENTING: Method PUT untuk Update
    await axios.put(`http://localhost:3000/api/alsintan/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    alert('Berhasil memperbarui data!');
    router.push(`/aset/${id}`); // Kembali ke halaman detail

  } catch (error) {
    console.error("Gagal update:", error);
    alert('Terjadi kesalahan saat menyimpan perubahan.');
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  fetchDetail();
});
</script>

<template>
  <div class="container-fluid">
    
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h2 class="fw-bold text-dark mb-0">✏️ Edit Aset</h2>
      <button @click="router.back()" class="btn btn-secondary">
        <i class="bi bi-arrow-left"></i> Batal
      </button>
    </div>

    <div v-if="isLoading" class="text-center py-5">
        <div class="spinner-border text-primary"></div>
    </div>

    <div v-else class="card border-0 shadow-sm">
      <div class="card-body p-4">
        
        <form @submit.prevent="submitForm">
          <div class="row g-3">
            
            <div class="col-md-6">
              <h5 class="text-primary mb-3">Informasi Perangkat</h5>
              
              <div class="mb-3">
                <label class="form-label fw-bold">Kode Perangkat</label>
                <input v-model="form.kode_perangkat" type="text" class="form-control" required>
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

            <div class="col-md-6">
              <h5 class="text-primary mb-3">Status & Gambar</h5>

              <div class="row">
                <div class="col-md-4 mb-3">
                  <label class="form-label">Status</label>
                  <select v-model="form.status" class="form-select bg-light">
                    <option value="OFF">OFF</option>
                    <option value="ON">ON</option>
                  </select>
                </div>
                <div class="col-md-4 mb-3">
                  <label class="form-label">Sensor</label>
                  <select v-model="form.status_sensor" class="form-select">
                    <option value="Normal">Normal</option>
                    <option value="Warning">Warning</option>
                    <option value="Error">Error</option>
                  </select>
                </div>
                <div class="col-md-4 mb-3">
                  <label class="form-label">Operasional</label>
                  <select v-model="form.status_operasional" class="form-select">
                    <option value="Siap Digunakan">Siap Digunakan</option>
                    <option value="Sedang Beroperasi">Sedang Beroperasi</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Rusak">Rusak</option>
                  </select>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Kapasitas Lahan</label>
                <input v-model="form.kapasitas_lahan" type="text" class="form-control">
              </div>

              <div class="mb-3">
                <label class="form-label">Foto Alat (Biarkan kosong jika tidak diganti)</label>
                <input @change="handleFileUpload" type="file" class="form-control" accept="image/*">
                
                <div class="mt-2 text-center border rounded p-2 bg-light">
                  <p class="small text-muted mb-1">Preview:</p>
                  <img 
                    v-if="previewGambar" 
                    :src="previewGambar" 
                    class="img-fluid" style="max-height: 150px;"
                  >
                  <img 
                    v-else-if="gambarLama" 
                    :src="`http://localhost:3000/uploads/${gambarLama}`" 
                    class="img-fluid" style="max-height: 150px;"
                    @error="$event.target.style.display='none'"
                  >
                  <span v-else class="text-muted small">Belum ada foto</span>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Deskripsi</label>
                <textarea v-model="form.deskripsi" class="form-control" rows="3"></textarea>
              </div>
            </div>

          </div>

          <div class="d-flex justify-content-end mt-4 pt-3 border-top">
            <button type="button" @click="router.back()" class="btn btn-light border me-2">Batal</button>
            <button type="submit" class="btn btn-primary px-4 fw-bold" :disabled="isSubmitting">
              <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2"></span>
              {{ isSubmitting ? 'Simpan Perubahan' : 'Update Aset' }}
            </button>
          </div>

        </form>

      </div>
    </div>
  </div>
</template>