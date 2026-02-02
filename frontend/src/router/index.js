import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import MonitoringView from '../views/MonitoringView.vue'
import AsetListView from '../views/aset/AsetListView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: DashboardView
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
    // {
    //   path: '/aset/tambah',
    //   name: 'aset-add',
    //   component: () => import('../views/aset/AsetAddView.vue')
    // },
    // {
    //   path: '/aset/:id',
    //   name: 'aset-detail',
    //   component: () => import('../views/aset/AsetDetailView.vue')
    // },
    {
      path: '/estimasi',
      name: 'estimasi',
      component: DashboardView
    }
  ]
})

export default router
