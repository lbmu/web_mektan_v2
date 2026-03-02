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


//Ambil ID dari storage
const getSession = () => {
    const session = localStorage.getItem('user');
    if (session) return JSON.parse(session);
    return null;
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
            previewFoto.value = `${IMAGE_BASE_URL}/profiles/${user.foto_profil}`;
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
            // Update LocalStorage agar nama/foto di Sidebar ikut berubah
            const newData = response.data.data;
            const newSession = {
                id: newData.user_id,
                username: newData.username,
                nama: newData.nama_lengkap, // Update nama
                role: newData.role,
                foto: newData.foto_profil     // Update foto
            };
            localStorage.setItem('user', JSON.stringify(newSession));

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
    <div class="container-fluid p-4">
        <h2 class="mb-4 fw-bold text-primary">👤 Profil Pengguna</h2>

        <div class="row">
            <div class="col-md-4 mb-4">
                <div class="card shadow-sm border-0 text-center p-4">
                    <div class="position-relative d-inline-block mx-auto mb-3">
                        <img :src="previewFoto || 'https://via.placeholder.com/150'" 
                            class="rounded-circle img-thumbnail" 
                            style="width: 150px; height: 150px; object-fit: cover;">
                        
                        <label for="uploadFoto" class="btn btn-sm btn-primary position-absolute bottom-0 end-0 rounded-circle" style="width: 35px; height: 35px;">
                            <i class="bi bi-camera-fill"></i>
                        </label>
                        <input type="file" id="uploadFoto" hidden @change="handleFileUpload" accept="image/*">
                    </div>
                    
                    <h5 class="fw-bold">{{ formData.nama_lengkap }}</h5>
                    <span class="badge bg-info text-dark">{{ formData.role }}</span>
                    <p class="text-muted small mt-2">{{ formData.email }}</p>
                </div>
            </div>

            <div class="col-md-8">
                <div class="card shadow-sm border-0">
                    <div class="card-header bg-white py-3">
                        <h6 class="m-0 fw-bold text-primary"><i class="bi bi-pencil-square me-2"></i>Edit Informasi</h6>
                    </div>
                    <div class="card-body p-4">
                        <form @submit.prevent="handleUpdate">
                            
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold">Username (Tidak bisa diubah)</label>
                                    <input type="text" class="form-control bg-light" v-model="formData.username" readonly>
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
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold">NIP / Nomor Induk</label>
                                    <input type="text" class="form-control" v-model="formData.nip" placeholder="Belum diisi">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold">No. Handphone / WA</label>
                                    <input type="text" class="form-control" v-model="formData.no_hp" placeholder="08...">
                                </div>
                            </div>

                            <hr class="my-4">

                            <div class="mb-3">
                                <label class="form-label small fw-bold text-danger">Ganti Password (Opsional)</label>
                                <input type="password" class="form-control" v-model="formData.password" placeholder="Isi hanya jika ingin mengganti password...">
                            </div>

                            <div class="d-flex justify-content-end">
                                <button type="submit" class="btn btn-primary px-4 fw-bold" :disabled="loading">
                                    <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                                    {{ loading ? 'Menyimpan...' : 'SIMPAN PERUBAHAN' }}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>