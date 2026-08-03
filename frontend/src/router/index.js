import { createRouter, createWebHistory } from 'vue-router'
import Swal from 'sweetalert2'

import DashboardView from '../views/DashboardView.vue'
import MonitoringView from '../views/MonitoringView.vue'
import AsetListView from '../views/aset/AsetListView.vue'
import LoginView from '../views/LoginView.vue'
import ProfileView from '../views/ProfileView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ==========================================
    // 🔓 AREA GUEST / PUBLIK (TIDAK PERLU LOGIN)
    // ==========================================
    {
      path: '/',
      name: 'home',
      component: DashboardView,
      meta: { requiresAuth: false } // [DIBUKA] Dashboard kini publik
    },
    {
      path: '/aset',
      name: 'aset-list',
      component: AsetListView,
      meta: { requiresAuth: false } // [DIBUKA] Daftar Aset kini publik
    },
    {
      path: '/aset/:id',
      name: 'aset-detail',
      component: () => import('../views/aset/AsetDetailView.vue'),
      meta: { requiresAuth: false } // [DIBUKA] Detail Aset kini publik
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresAuth: false, isPublicLayout: true } // isPublicLayout agar sidebar hilang di hal login
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
      meta: { requiresAuth: false, isPublicLayout: true } 
    },

    // ==========================================
    // 🔒 AREA PRIVATE (WAJIB LOGIN)
    // ==========================================
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView,
      meta: { requiresAuth: true }
    },
    {
      path: '/monitoring',
      name: 'monitoring',
      component: MonitoringView,
      meta: { requiresAuth: true }
    },
    {
      path: '/monitoring/:id', 
      name: 'monitoring-detail',
      component: () => import('../views/MonitoringDetailView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/estimasi',
      name: 'estimasi',
      component: () => import('../views/EstimasiView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/antrean',
      name: 'antrean',
      component: () => import('../views/aset/AntreanView.vue'), // Sesuaikan jalurnya jika diletakkan di luar folder aset
      meta: { requiresAuth: true } // Hanya Admin yang boleh masuk
    },
    // --- SEGMENTED ROLES (Hanya Super Admin) --- //
    {
      path: '/aset/tambah',
      name: 'aset-add',
      component: () => import('../views/aset/AsetAddView.vue'),
      meta: { requiresAuth: true, allowedRoles: ['mektan'] }
    },
    {
      path: '/aset/edit/:id',
      name: 'aset-edit',
      component: () => import('../views/aset/AsetEditView.vue'),
      meta: { requiresAuth: true, allowedRoles: ['mektan'] }
    },
    {
    path: '/verifikasi-akun',
    name: 'verifikasi-akun',
    component: () => import('../views/VerifikasiAkunView.vue')
    }
  ]
})

router.beforeEach((to, from, next) => {
  const sessionString = sessionStorage.getItem('user');
  const token = sessionStorage.getItem('token'); 
  
  let isAuthenticated = false;
  let userRole = '';

  if (sessionString && token) {
      try {
          const userData = JSON.parse(sessionString);
          if (userData && userData.id) {
              isAuthenticated = true;
              userRole = userData.role; 
          }
      } catch (e) {
          sessionStorage.removeItem('user'); 
          sessionStorage.removeItem('token'); 
      }
  }

  // 1. Cek Kewajiban Login
  if (to.meta.requiresAuth && !isAuthenticated) {
    Swal.fire({
        icon: 'warning',
        title: 'Akses Terbatas',
        text: 'Fitur ini hanya untuk pengguna terdaftar. Silakan login terlebih dahulu.',
        toast: true,
        position: 'top',
        timer: 3000,
        showConfirmButton: false,
        customClass: {
                popup: 'shadow-sm border border-success border-opacity-25 rounded-4' // Integrasi dengan class Bootstrap
        },
        showClass: { popup: `
        animate__animated
        animate__fadeIn 
        animate__faster
        ` },
        hideClass: { popup: `
        animate__animated
        animate__fadeOut
        animate__faster
        ` }
    });
    next({ name: 'login' });
    return;
  } 
  
  // 2. Cegah orang yang sudah login masuk ke halaman login/register lagi
  if ((to.name === 'login' || to.name === 'register') && isAuthenticated) {
    next({ name: 'home' }); 
    return;
  }

  // 3. Cek Hak Akses Tingkatan Pengguna (RBAC)
  if (to.meta.allowedRoles) {
      if (!to.meta.allowedRoles.includes(userRole)) {
          Swal.fire({
              icon: 'error',
              title: 'Akses Ditolak!',
              text: 'Anda tidak memiliki izin untuk membuka halaman ini.',
          });
          next(from.path); 
          return;
      }
  }

  next();
});

export default router