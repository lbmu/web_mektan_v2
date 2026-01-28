import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import MonitoringView from '../views/MonitoringView.vue'

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
      name: 'aset',
      component: DashboardView
    },
    {
      path: '/estimasi',
      name: 'estimasi',
      component: DashboardView
    }
  ]
})

export default router
