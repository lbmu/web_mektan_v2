<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import Swal from 'sweetalert2';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL;

const formData = ref({
    id: '',
    username: '',
    email: '',
    nama_lengkap: '', // Untuk Mektan: Nama Petugas, Untuk UPJA: Nama Penanggung Jawab
    nip: '',          // Khusus Mektan
    no_hp: '',
    role: '',
    password: '',
    
    // [BARU] Data khusus UPJA
    nama_instansi: '', 
    kabupaten: '',
    kecamatan: '',
    desa: ''
});

const fileFoto = ref(null);
const previewFoto = ref(null);
const loading = ref(false);

// State untuk Emsifa API (Dropdown Wilayah)
const kabs = ref([]);
const kecs = ref([]);
const desas = ref([]);

const selectedKabId = ref('');
const selectedKecId = ref('');
const selectedDesaId = ref('');
const isLoadingWilayah = ref(false);

const getSession = () => {
    const session = sessionStorage.getItem('user');
    if (session) return JSON.parse(session);
    return null;
};

const formatRole = (role) => {
    if (!role) return '-';
    if (role === 'mektan') return 'Admin Balai Mektan';
    if (role === 'upja') return 'UPJA / Kelompok Tani';
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const toTitleCase = (str) => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// ==========================================
// LOGIKA EMSIFA API (WILAYAH)
// ==========================================
const loadKabs = async () => {
    try {
        const res = await axios.get('https://www.emsifa.com/api-wilayah-indonesia/api/regencies/32.json');
        kabs.value = res.data;
    } catch (error) { console.error("Gagal load kabupaten"); }
};

const loadKecs = async (kabId) => {
    if (!kabId) { kecs.value = []; desas.value = []; return; }
    try {
        const res = await axios.get(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${kabId}.json`);
        kecs.value = res.data;
    } catch (error) {}
};

const loadDesas = async (kecId) => {
    if (!kecId) { desas.value = []; return; }
    try {
        const res = await axios.get(`https://www.emsifa.com/api-wilayah-indonesia/api/villages/${kecId}.json`);
        desas.value = res.data;
    } catch (error) {}
};

// Event onChange Dropdown
const onKabChange = async () => {
    selectedKecId.value = '';
    selectedDesaId.value = '';
    if (selectedKabId.value) {
        isLoadingWilayah.value = true;
        await loadKecs(selectedKabId.value);
        isLoadingWilayah.value = false;
    }
};

const onKecChange = async () => {
    selectedDesaId.value = '';
    if (selectedKecId.value) {
        isLoadingWilayah.value = true;
        await loadDesas(selectedKecId.value);
        isLoadingWilayah.value = false;
    }
};

onMounted(async () => {
    const session = getSession();
    if (!session || !session.id) {
        window.location.href = '/login';
        return;
    }

    try {
        const response = await axios.get(`${API_BASE_URL}/users/profile/${session.id}`);
        const user = response.data.data || response.data;

        formData.value = {
            id: user.user_id,
            username: user.username,
            email: user.email,
            nama_lengkap: user.nama_lengkap,
            nip: user.nip || '',
            no_hp: user.no_hp || user.no_handphone || '',
            role: user.role,
            password: '',
            nama_instansi: user.nama_instansi || '',
            kabupaten: user.kabupaten || '',
            kecamatan: user.kecamatan || '',
            desa: user.desa || ''
        };

        if (user.foto_profil) {
            if (user.foto_profil.startsWith('http')) {
                previewFoto.value = user.foto_profil; 
            } else {
                previewFoto.value = `${IMAGE_BASE_URL}/profiles/${user.foto_profil}`;
            }
        }

        // [BARU] Logika Auto-Fill Dropdown Wilayah (Reverse Lookup)
        if (user.role === 'upja') {
            isLoadingWilayah.value = true;
            await loadKabs();
            
            if (user.kabupaten) {
                const matchKab = kabs.value.find(k => k.name.toUpperCase() === user.kabupaten.toUpperCase());
                if (matchKab) {
                    selectedKabId.value = matchKab.id;
                    await loadKecs(matchKab.id);
                    
                    if (user.kecamatan) {
                        const matchKec = kecs.value.find(k => k.name.toUpperCase() === user.kecamatan.toUpperCase());
                        if (matchKec) {
                            selectedKecId.value = matchKec.id;
                            await loadDesas(matchKec.id);
                            
                            if (user.desa) {
                                const matchDesa = desas.value.find(d => d.name.toUpperCase() === user.desa.toUpperCase());
                                if (matchDesa) selectedDesaId.value = matchDesa.id;
                            }
                        }
                    }
                }
            }
            isLoadingWilayah.value = false;
        }

    } catch (error) {
        Swal.fire('Error', 'Gagal mengambil data profil.', 'error');
    }
});

const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
        fileFoto.value = file;
        previewFoto.value = URL.createObjectURL(file);
    }
};

const handleUpdate = async () => {
    loading.value = true;
    
    // Konversi ID Wilayah menjadi Teks Nama untuk disimpan di DB
    let namaKabText = '';
    let namaKecText = '';
    let namaDesaText = '';
    
    if (formData.value.role === 'upja') {
        if (!selectedKabId.value || !selectedKecId.value || !selectedDesaId.value) {
            Swal.fire('Perhatian', 'Mohon lengkapi data alamat wilayah Anda secara utuh.', 'warning');
            loading.value = false;
            return;
        }
        namaKabText = kabs.value.find(k => k.id === selectedKabId.value)?.name || '';
        namaKecText = kecs.value.find(k => k.id === selectedKecId.value)?.name || '';
        namaDesaText = desas.value.find(d => d.id === selectedDesaId.value)?.name || '';
    }

    const form = new FormData();
    form.append('username', formData.value.username);
    form.append('nama_lengkap', formData.value.nama_lengkap); // Mektan: Nama, UPJA: Nama PJ
    form.append('email', formData.value.email);
    form.append('no_hp', formData.value.no_hp);
    
    if (formData.value.role === 'mektan') {
        form.append('nip', formData.value.nip);
    } else if (formData.value.role === 'upja') {
        form.append('nama_instansi', formData.value.nama_instansi);
        form.append('kabupaten', namaKabText);
        form.append('kecamatan', namaKecText);
        form.append('desa', namaDesaText);
    }
    
    if (formData.value.password) form.append('password', formData.value.password);
    if (fileFoto.value) form.append('foto', fileFoto.value);

    try {
        const session = getSession();
        const response = await axios.put(`${API_BASE_URL}/users/update/${session.id}`, form, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data.status) {
            const newData = response.data.data;
            const newSession = {
                ...session, 
                id: newData.user_id,
                username: newData.username,
                // Pastikan yang dipasang di session adalah nama lengkap/instansi sesuai peruntukan
                nama: formData.value.role === 'upja' ? formData.value.nama_instansi : newData.nama_lengkap, 
                nama_lengkap: newData.nama_lengkap,
                role: newData.role,
                foto: newData.foto_profil     
            };
            sessionStorage.setItem('user', JSON.stringify(newSession));

            Swal.fire('Berhasil', 'Profil berhasil diperbarui!', 'success').then(() => {
                window.location.reload();
            });
        }

    } catch (error) {
        Swal.fire('Gagal', 'Terjadi kesalahan saat menyimpan data.', 'error');
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <div class="container-fluid p-4 pb-5">
        <h3 class="mb-4 fw-bold text-primary"><i class="bi bi-person-circle me-2"></i>Profil Pengguna</h3>

        <div class="row g-4">
            <div class="col-md-4">
                <div class="card shadow-sm border-0 text-center p-4 h-100">
                    
                    <div class="position-relative d-inline-block mx-auto mb-4 mt-2">
                        <div class="rounded-circle shadow-sm p-1 bg-white" style="width: 160px; height: 160px;">
                            <img :src="previewFoto || 'https://via.placeholder.com/150'" 
                                class="rounded-circle w-100 h-100" 
                                style="object-fit: cover; border: 1px solid #e9ecef;">
                        </div>
                        
                        <label for="uploadFoto" 
                               class="btn btn-primary position-absolute rounded-circle d-flex align-items-center justify-content-center shadow" 
                               style="width: 42px; height: 42px; bottom: 5px; right: 5px; border: 3px solid white; cursor: pointer; transition: transform 0.2s;">
                            <i class="bi bi-camera-fill fs-5"></i>
                        </label>
                        <input type="file" id="uploadFoto" hidden @change="handleFileUpload" accept="image/*">
                    </div>
                    
                    <!-- Dinamis: Menampilkan Nama Instansi (UPJA) atau Nama Lengkap (Mektan) -->
                    <h4 class="fw-bold text-dark mb-1">
                        {{ formData.role === 'upja' && formData.nama_instansi ? formData.nama_instansi : formData.nama_lengkap }}
                    </h4>
                    
                    <span class="badge bg-info text-dark px-3 py-2 rounded-pill fw-bold mt-2 mb-2">{{ formatRole(formData.role) }}</span>
                    
                    <!-- Info Ekstra untuk UPJA -->
                    <p v-if="formData.role === 'upja'" class="text-muted small mt-2 fw-bold text-success">
                        <i class="bi bi-person-badge-fill me-1"></i> PJ: {{ formData.nama_lengkap }}
                    </p>

                    <p class="text-muted small mt-2"><i class="bi bi-envelope-fill me-1"></i> {{ formData.email }}</p>
                </div>
            </div>

            <div class="col-md-8">
                <div class="card shadow-sm border-0 h-100">
                    <div class="card-header bg-white py-3 border-bottom-0">
                        <h6 class="m-0 fw-bold text-primary"><i class="bi bi-pencil-square me-2"></i>Edit Informasi</h6>
                    </div>
                    <div class="card-body p-4 pt-2">
                        <form @submit.prevent="handleUpdate">
                            
                            <!-- Akun Dasar -->
                            <div class="row mb-3">
                                <div class="col-md-6 mb-3 mb-md-0">
                                    <label class="form-label small fw-bold text-muted">Username (Permanen)</label>
                                    <input type="text" class="form-control bg-light text-secondary fw-bold" v-model="formData.username" readonly>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold">Email Utama</label>
                                    <input type="email" class="form-control" v-model="formData.email" required>
                                </div>
                            </div>

                            <hr class="my-4 text-muted opacity-25">

                            <!-- BLOK: KHUSUS MEKTAN -->
                            <div v-if="formData.role === 'mektan'" class="mb-3">
                                <div class="row mb-3">
                                    <div class="col-md-6 mb-3 mb-md-0">
                                        <label class="form-label small fw-bold text-primary">Nama Petugas Mektan</label>
                                        <input type="text" class="form-control" v-model="formData.nama_lengkap" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label small fw-bold text-primary">NIP / Nomor Induk</label>
                                        <input type="text" class="form-control" v-model="formData.nip" placeholder="Masukkan NIP...">
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label small fw-bold">No. Handphone / WA</label>
                                    <input type="text" class="form-control" v-model="formData.no_hp" placeholder="08..." required>
                                </div>
                            </div>

                            <!-- BLOK: KHUSUS UPJA (INSTANSI & WILAYAH) -->
                            <div v-else-if="formData.role === 'upja'">
                                <div class="row mb-3">
                                    <div class="col-md-6 mb-3 mb-md-0">
                                        <label class="form-label small fw-bold text-success">Nama Instansi / UPJA</label>
                                        <input type="text" class="form-control border-success" v-model="formData.nama_instansi" placeholder="Misal: UPJA Tani Maju" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label small fw-bold text-success">Nama Penanggung Jawab (PJ)</label>
                                        <input type="text" class="form-control" v-model="formData.nama_lengkap" placeholder="Sesuai KTP" required>
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label small fw-bold">No. WhatsApp PJ (Aktif)</label>
                                    <input type="text" class="form-control" v-model="formData.no_hp" placeholder="08..." required>
                                </div>

                                <!-- DROPDOWN WILAYAH (EMSIFA) -->
                                <div class="alert alert-secondary py-2 mt-4 mb-3 border-0 rounded">
                                    <h6 class="mb-0 fw-bold text-secondary fs-6"><i class="bi bi-geo-alt-fill me-2"></i>Alamat Operasional UPJA</h6>
                                </div>

                                <div class="row mb-3">
                                    <div class="col-md-12 mb-3">
                                        <label class="form-label small fw-bold">Kabupaten / Kota</label>
                                        <select class="form-select" v-model="selectedKabId" @change="onKabChange" :disabled="isLoadingWilayah" required>
                                            <option value="">-- Pilih Kabupaten --</option>
                                            <option v-for="k in kabs" :key="k.id" :value="k.id">{{ toTitleCase(k.name) }}</option>
                                        </select>
                                    </div>
                                    <div class="col-md-6 mb-3 mb-md-0">
                                        <label class="form-label small fw-bold">Kecamatan</label>
                                        <select class="form-select" v-model="selectedKecId" @change="onKecChange" :disabled="!selectedKabId || isLoadingWilayah" required>
                                            <option value="">-- Pilih Kecamatan --</option>
                                            <option v-for="k in kecs" :key="k.id" :value="k.id">{{ toTitleCase(k.name) }}</option>
                                        </select>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label small fw-bold">Desa / Kelurahan Utama</label>
                                        <select class="form-select" v-model="selectedDesaId" :disabled="!selectedKecId || isLoadingWilayah" required>
                                            <option value="">-- Pilih Desa --</option>
                                            <option v-for="d in desas" :key="d.id" :value="d.id">{{ toTitleCase(d.name) }}</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <hr class="my-4 text-muted opacity-25">

                            <div class="mb-4">
                                <label class="form-label small fw-bold text-warning-emphasis"><i class="bi bi-shield-lock-fill me-1"></i>Ganti Password (Opsional)</label>
                                <input type="password" class="form-control border-warning-subtle" v-model="formData.password" placeholder="Isi hanya jika ingin mengganti password Anda...">
                            </div>

                            <div class="d-flex justify-content-end mt-4">
                                <button type="submit" class="btn btn-primary px-5 fw-bold shadow-sm" :disabled="loading || isLoadingWilayah">
                                    <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                                    {{ loading ? 'MENYIMPAN...' : 'SIMPAN PERUBAHAN' }}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
label[for="uploadFoto"]:hover {
    transform: scale(1.05);
    background-color: #0b5ed7;
}
</style>