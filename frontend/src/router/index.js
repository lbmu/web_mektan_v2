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
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      name: 'home',
      component: DashboardView,
      meta: { requiresAuth: true }
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView,
      meta: { requiresAuth: true }
    },
    {
      path: '/monitoring',
      name: 'monitoring',
      component: MonitoringView
    },
    {
      path: '/monitoring/:id', 
      name: 'monitoring-detail',
      component: () => import('../views/MonitoringDetailView.vue')
    },
    {
      path: '/estimasi',
      name: 'estimasi',
      component: () => import('../views/EstimasiView.vue')
    },
    // --- SEGMENTED ROLES --- //
    {
      path: '/aset',
      name: 'aset-list',
      component: AsetListView,
      meta: { requiresAuth: true }
    },
    {
      path: '/aset/tambah',
      name: 'aset-add',
      component: () => import('../views/aset/AsetAddView.vue'),
      meta: { requiresAuth: true, allowedRoles: ['super_admin'] }
    },
    {
      path: '/aset/:id',
      name: 'aset-detail',
      component: () => import('../views/aset/AsetDetailView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/aset/edit/:id',
      name: 'aset-edit',
      component: () => import('../views/aset/AsetEditView.vue'),
      meta: { requiresAuth: true, allowedRoles: ['super_admin'] }
    }
  ]
})

router.beforeEach((to, from, next) => {
  const sessionString = localStorage.getItem('user');
  let isAuthenticated = false;
  let userRole = '';

  if (sessionString) {
      try {
          const userData = JSON.parse(sessionString);
          if (userData && userData.id) {
              isAuthenticated = true;
              userRole = userData.role || 'operator'; // Ambil role
          }
      } catch (e) {
          localStorage.removeItem('user'); 
      }
  }

  // 1. Cek Login
  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'login' });
    return;
  } 
  
  // 2. Cegah orang yang sudah login masuk ke halaman login lagi
  if (to.name === 'login' && isAuthenticated) {
    next({ name: 'home' });
    return;
  }

  // 3. Cek Hak Akses (RBAC)
  if (to.meta.allowedRoles) {
      // Jika role user saat ini TIDAK ADA di dalam daftar allowedRoles
      if (!to.meta.allowedRoles.includes(userRole)) {
          Swal.fire({
              icon: 'error',
              title: 'Akses Ditolak!',
              text: 'Anda tidak memiliki izin untuk membuka halaman ini.',
          });
          next(from.path); // Kembalikan ke halaman sebelumnya
          return;
      }
  }

  // Lolos semua pemeriksaan
  next();
});

export default router
