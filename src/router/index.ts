import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { APP_ROUTES } from '@/constants/app-routes'

const routes: RouteRecordRaw[] = [
  {
    path: APP_ROUTES.HOME.path,
    name: APP_ROUTES.HOME.name,
    component: () => import('@/views/HomeView.vue'),
  },
  {
    path: APP_ROUTES.LOGIN.path,
    name: APP_ROUTES.LOGIN.name,
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresAuth: false },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
