import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { APP_ROUTES } from '@/constants/appRoutes'
import { useAuthStore } from '@/store/useAuthStore'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/DashboardLayout.vue'),
    children: [
      {
        path: APP_ROUTES.HOME.path,
        name: APP_ROUTES.HOME.name,
        component: () => import('@/views/PointOfSaleView.vue'),
      },
      {
        path: APP_ROUTES.DASHBOARD.path,
        name: APP_ROUTES.DASHBOARD.name,
        component: () => import('@/views/UnderMaintenanceView.vue'),
      },
      {
        path: APP_ROUTES.ORDERS.path,
        name: APP_ROUTES.ORDERS.name,
        component: () => import('@/views/UnderMaintenanceView.vue'),
      },
      {
        path: APP_ROUTES.INVENTORY.path,
        name: APP_ROUTES.INVENTORY.name,
        component: () => import('@/views/UnderMaintenanceView.vue'),
      },
      {
        path: APP_ROUTES.CATEGORIES.path,
        name: APP_ROUTES.CATEGORIES.name,
        component: () => import('@/views/UnderMaintenanceView.vue'),
      },
      {
        path: APP_ROUTES.SALE_REPORTS.path,
        name: APP_ROUTES.SALE_REPORTS.name,
        component: () => import('@/views/UnderMaintenanceView.vue'),
      },
      {
        path: APP_ROUTES.ANALYTICS.path,
        name: APP_ROUTES.ANALYTICS.name,
        component: () => import('@/views/UnderMaintenanceView.vue'),
      },
      {
        path: APP_ROUTES.STAFF.path,
        name: APP_ROUTES.STAFF.name,
        component: () => import('@/views/UnderMaintenanceView.vue'),
      },
    ],
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
