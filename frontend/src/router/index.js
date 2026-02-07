import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import MonitoringView from '../views/MonitoringView.vue'
import AsetListView from '../views/aset/AsetListView.vue'
import LoginView from '../views/LoginView.vue'

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
      path: '/monitoring',
      name: 'monitoring',
      component: MonitoringView
    },
    {
      path: '/aset',
      name: 'aset-list',
      component: AsetListView
    },
    {
      path: '/aset/tambah',
      name: 'aset-add',
      component: () => import('../views/aset/AsetAddView.vue')
    },
    {
      path: '/aset/:id',
      name: 'aset-detail',
      component: () => import('../views/aset/AsetDetailView.vue')
    },
    {
      path: '/aset/edit/:id',
      name: 'aset-edit',
      component: () => import('../views/aset/AsetEditView.vue')
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
    }
  ]
})

router.beforeEach((to, from, next) => {
  // 1. Ambil data dari LocalStorage
  const sessionString = localStorage.getItem('user');
  let isAuthenticated = false;

  // 2. Validasi sederhana: Apakah datanya ada dan valid JSON-nya?
  if (sessionString) {
      try {
          const userData = JSON.parse(sessionString);
          if (userData && userData.id) {
              isAuthenticated = true; // Dianggap Login jika ada ID user
          }
      } catch (e) {
          console.error("Session rusak, dianggap logout.");
          localStorage.removeItem('user'); // Bersihkan sampah
      }
  }

  // [DEBUG] Lihat di Console kenapa dia menendang/mengizinkan
  console.log(`Navigasi ke: ${to.name} | Login? ${isAuthenticated}`);

  // 3. Logika Satpam
  if (to.meta.requiresAuth && !isAuthenticated) {
    // Mau ke Dashboard TAPI belum login -> Tendang ke Login
    console.warn("Ditolak: Butuh login.");
    next({ name: 'login' });
  } else if (to.name === 'login' && isAuthenticated) {
    // Sudah login TAPI mau ke halaman Login -> Lempar ke Home
    console.log("Sudah login, dialihkan ke Home.");
    next({ name: 'home' });
  } else {
    // Silakan lewat
    next();
  }
});

export default router
