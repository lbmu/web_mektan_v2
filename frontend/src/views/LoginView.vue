<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import Swal from 'sweetalert2';

const router = useRouter();
const identifier = ref('');
const password = ref('');
const loading = ref(false);

const handleLogin = async () => {
    if (!identifier.value || !password.value) {
        Swal.fire('Gagal', 'Mohon isi Username/Email dan Password!', 'warning');
        return;
    }

    loading.value = true;

    try {
        const response = await axios.post('http://localhost:3000/api/users/login', {
            identifier: identifier.value,
            password: password.value
        });

        if (response.data.status) {
            const userData = response.data.data;
            localStorage.setItem('user', JSON.stringify(userData));

            Swal.fire({
                icon: 'success',
                title: 'Login Berhasil',
                text: `Selamat datang, ${userData.name}`,
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                window.location.href = '/';
            });
        }
    } catch (error) {
        console.error(error);
        const pesan = error.response?.data?.message || 'Terjadi kesalahan saat login.';
        Swal.fire('Login Gagal', pesan, 'error');
    } finally {
        loading.value = false;
    }
}

</script>

<template>
    <div class="login-container d-flex align-items-center justify-content-center">
        <div class="card shadow-lg border-0 login-card">
            <div class="card-body p-5">
                <div class="text-center mb-4">
                    <h3 class="fw-bold text-primary">🔐 SI-ALSINTAN</h3>
                    <p class="text-muted small">Silakan login untuk masuk ke sistem</p>
                </div>

                <form @submit.prevent="handleLogin">
                    <div class="mb-3">
                        <label class="form-label fw-bold small">Username / Email</label>
                        <input v-model="identifier" type="text" class="form-control form-control-lg bg-light" placeholder="Masukan ID Anda..." required>
                    </div>

                    <div class="mb-4">
                        <label class="form-label fw-bold small">Password</label>
                        <input v-model="password" type="password" class="form-control form-control-lg bg-light" placeholder="••••••••" required>
                    </div>

                    <button type="submit" class="btn btn-primary w-100 btn-lg fw-bold" :disabled="loading">
                        <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                        {{ loading ? 'Memproses...' : 'MASUK SEKARANG' }}
                    </button>
                </form>

                <div class="text-center mt-4">
                    <small class="text-muted">Lupa Password? Hubungi Super Admin.</small>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.login-container {
    height: 100vh;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}
.login-card {
    width: 100%;
    max-width: 400px;
    border-radius: 15px;
}
</style>