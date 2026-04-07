import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { APP_ROUTES } from '@/constants/appRoutes'
import { useAuthStore } from '@/store/useAuthStore'

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

router.beforeEach(to => {
  const authStore = useAuthStore()
  const requiresAuth = to.meta.requiresAuth !== false

  // Redirect users to Login if they try to access a protected route without authentication
  if (requiresAuth && !authStore.isAuthenticated()) {
    return { name: APP_ROUTES.LOGIN.name }
  }

  // Optional Enhancement: If already logged in, redirect them away from Login to Home
  if (to.name === APP_ROUTES.LOGIN.name && authStore.isAuthenticated()) {
    return { name: APP_ROUTES.HOME.name }
  }
})

export default router
