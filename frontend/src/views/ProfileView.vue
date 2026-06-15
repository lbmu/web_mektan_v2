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
    nama_lengkap: '',
    nip: '',
    no_hp: '',
    role: '',
    password: '',
});

const fileFoto = ref(null);
const previewFoto = ref(null);
const loading = ref(false);

// Ambil ID dari storage
const getSession = () => {
    const session = sessionStorage.getItem('user');
    if (session) return JSON.parse(session);
    return null;
};

// IMPROVEMENT: Fungsi untuk merapikan teks Role
const formatRole = (role) => {
    if (!role) return '-';
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

onMounted(async () => {
    const session = getSession();
    if (!session || !session.id) {
        console.warn("Tidak ada sesi pengguna, alihkan ke halaman login.");
        window.location.href = '/login';
        return;
    }

    try {
        const response = await axios.get(`${API_BASE_URL}/users/profile/${session.id}`);
        const user = response.data.data || response.data;

        if (!user) {
            throw new Error("Data pengguna tidak ditemukan");
        }

        formData.value = {
            id: user.user_id,
            username: user.username,
            email: user.email,
            nama_lengkap: user.nama_lengkap,
            nip: user.nip || '',
            no_hp: user.no_hp || user.no_handphone || '',
            role: user.role,
            password: ''
        };

        if (user.foto_profil) {
            // KUNCI CLOUDINARY: Cek apakah nama file diawali dengan 'http'
            if (user.foto_profil.startsWith('http')) {
                previewFoto.value = user.foto_profil; 
            } else {
                // Fallback untuk data profil lama yang masih lokal
                previewFoto.value = `${IMAGE_BASE_URL}/profiles/${user.foto_profil}`;
            }
        }

    } catch (error) {
        console.error("Gagal mengambil data profil:", error);
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
    
    // Gunakan FormData karena ada file upload
    const form = new FormData();
    form.append('username', formData.value.username);
    form.append('nama_lengkap', formData.value.nama_lengkap);
    form.append('email', formData.value.email);
    form.append('nip', formData.value.nip);
    form.append('no_hp', formData.value.no_hp);
    
    // Hanya kirim password jika diisi
    if (formData.value.password) {
        form.append('password', formData.value.password);
    }

    // Hanya kirim file jika ada yang dipilih
    if (fileFoto.value) {
        form.append('foto', fileFoto.value);
    }

    try {
        const session = getSession();
        const response = await axios.put(`${API_BASE_URL}/users/update/${session.id}`, form, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data.status) {
            // Update sessionStorage agar nama/foto di Sidebar ikut berubah
            const newData = response.data.data;
            const newSession = {
                ...session, // Pertahankan data sesi lain jika ada
                id: newData.user_id,
                username: newData.username,
                nama: newData.nama_lengkap, 
                role: newData.role,
                foto: newData.foto_profil     
            };
            sessionStorage.setItem('user', JSON.stringify(newSession));

            Swal.fire('Berhasil', 'Profil berhasil diperbarui!', 'success').then(() => {
                // Refresh halaman agar Sidebar membaca data baru
                window.location.reload();
            });
        }

    } catch (error) {
        console.error("Update Error:", error);
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
                    
                    <h4 class="fw-bold text-dark mb-1">{{ formData.nama_lengkap }}</h4>
                    <span class="badge bg-info text-dark px-3 py-2 rounded-pill fw-bold">{{ formatRole(formData.role) }}</span>
                    <p class="text-muted small mt-3"><i class="bi bi-envelope-fill me-1"></i> {{ formData.email }}</p>
                </div>
            </div>

            <div class="col-md-8">
                <div class="card shadow-sm border-0 h-100">
                    <div class="card-header bg-white py-3 border-bottom-0">
                        <h6 class="m-0 fw-bold text-primary"><i class="bi bi-pencil-square me-2"></i>Edit Informasi</h6>
                    </div>
                    <div class="card-body p-4 pt-2">
                        <form @submit.prevent="handleUpdate">
                            
                            <div class="row mb-3">
                                <div class="col-md-6 mb-3 mb-md-0">
                                    <label class="form-label small fw-bold text-muted">Username (Tidak bisa diubah)</label>
                                    <input type="text" class="form-control bg-light text-secondary fw-bold" v-model="formData.username" readonly>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold">Email</label>
                                    <input type="email" class="form-control" v-model="formData.email" required>
                                </div>
                            </div>

                            <div class="mb-3">
                                <label class="form-label small fw-bold">Nama Lengkap</label>
                                <input type="text" class="form-control" v-model="formData.nama_lengkap" required>
                            </div>

                            <div class="row mb-3">
                                <div class="col-md-6 mb-3 mb-md-0">
                                    <label class="form-label small fw-bold">NIP / Nomor Induk</label>
                                    <input type="text" class="form-control" v-model="formData.nip" placeholder="Belum diisi">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold">No. Handphone / WA</label>
                                    <input type="text" class="form-control" v-model="formData.no_hp" placeholder="08...">
                                </div>
                            </div>

                            <hr class="my-4 text-muted opacity-25">

                            <div class="mb-4">
                                <label class="form-label small fw-bold text-warning-emphasis"><i class="bi bi-shield-lock-fill me-1"></i>Ganti Password (Opsional)</label>
                                <input type="password" class="form-control border-warning-subtle" v-model="formData.password" placeholder="Isi hanya jika ingin mengganti password Anda...">
                            </div>

                            <div class="d-flex justify-content-end mt-4">
                                <button type="submit" class="btn btn-primary px-5 fw-bold shadow-sm" :disabled="loading">
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
/* Sedikit efek hover pada tombol kamera */
label[for="uploadFoto"]:hover {
    transform: scale(1.05);
    background-color: #0b5ed7; /* Warna primary sedikit lebih gelap */
}
</style>