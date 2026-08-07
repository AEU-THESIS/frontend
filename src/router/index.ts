import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { APP_ROUTES } from '@/constants/appRoutes'
import { useAuthStore } from '@/store/useAuthStore'
import { ROLES } from '@/constants/roles'
import { toast } from 'vue-sonner'
import { useShopSettingsStore } from '@/store/useShopSettingsStore'

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
        component: () => import('@/views/DashboardView.vue'),
        meta: { roles: [ROLES.ADMIN, ROLES.MANAGER] },
      },
      {
        path: APP_ROUTES.ORDERS.path,
        name: APP_ROUTES.ORDERS.name,
        component: () => import('@/views/OrderManagement.vue'),
      },
      {
        path: APP_ROUTES.ORDER_HISTORY.path,
        name: APP_ROUTES.ORDER_HISTORY.name,
        component: () => import('@/views/OrderHistoryView.vue'),
      },
      {
        path: APP_ROUTES.PRODUCT.path,
        name: APP_ROUTES.PRODUCT.name,
        component: () => import('@/views/ProductManagement.vue'),
        meta: { roles: [ROLES.ADMIN, ROLES.MANAGER] },
      },
      {
        path: APP_ROUTES.INVENTORY.path,
        name: APP_ROUTES.INVENTORY.name,
        component: () => import('@/views/InventoryManagementView.vue'),
        meta: { roles: [ROLES.ADMIN, ROLES.MANAGER] },
      },
      {
        path: APP_ROUTES.CATEGORIES.path,
        name: APP_ROUTES.CATEGORIES.name,
        component: () => import('@/views/CategoryManagement.vue'),
        meta: { roles: [ROLES.ADMIN, ROLES.MANAGER] },
      },
      {
        path: APP_ROUTES.SALE_REPORTS.path,
        name: APP_ROUTES.SALE_REPORTS.name,
        component: () => import('@/views/SaleReportSummaryView.vue'),
        meta: { roles: [ROLES.ADMIN, ROLES.MANAGER] },
      },
      {
        path: APP_ROUTES.PROMOTIONS.path,
        name: APP_ROUTES.PROMOTIONS.name,
        component: () => import('@/views/PromotionsManagementView.vue'),
        meta: { roles: [ROLES.ADMIN, ROLES.MANAGER] },
      },
      {
        path: APP_ROUTES.STAFF.path,
        name: APP_ROUTES.STAFF.name,
        component: () => import('@/views/StaffManagementView.vue'),
        meta: { roles: [ROLES.ADMIN] },
      },
      {
        path: APP_ROUTES.SETTINGS.path,
        name: APP_ROUTES.SETTINGS.name,
        component: () => import('@/views/SettingsView.vue'),
        meta: { roles: [ROLES.ADMIN] },
      },
    ],
  },
  {
    path: APP_ROUTES.LOGIN.path,
    name: APP_ROUTES.LOGIN.name,
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFound.vue'),
  },
  {
    path: APP_ROUTES.FORGOT_PASSWORD.path,
    name: APP_ROUTES.FORGOT_PASSWORD.name,
    component: () => import('@/views/ForgotPasswordView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: APP_ROUTES.RESET_PASSWORD.path,
    name: APP_ROUTES.RESET_PASSWORD.name,
    component: () => import('@/views/ResetPasswordView.vue'),
    meta: { requiresAuth: false },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(to => {
  const authStore = useAuthStore()
  const shopSettingsStore = useShopSettingsStore()
  const requiresAuth = to.meta.requiresAuth !== false

  // Redirect users to Login if they try to access a protected route without authentication
  if (requiresAuth && !authStore.isAuthenticated()) {
    return { name: APP_ROUTES.LOGIN.name }
  }

  // Redirect away from orders if order management is disabled for this shop
  if (to.name === APP_ROUTES.ORDERS.name && !shopSettingsStore.is_order_management_enabled) {
    toast.error('Order Management is disabled for this shop.')
    return { name: APP_ROUTES.HOME.name }
  }

  // Check RBAC roles
  if (requiresAuth && to.meta.roles) {
    const allowedRoles = to.meta.roles as string[]
    const userRole = authStore.user?.role
    if (!userRole || !allowedRoles.includes(userRole)) {
      toast.error('401 Unauthorized Access: You do not have permission to view this page.')
      // Fall back to POS (Home), the one page every authenticated role can access.
      // Redirecting to Dashboard here would infinite-loop for roles now barred from it.
      return { name: APP_ROUTES.HOME.name }
    }
  }

  // Optional Enhancement: If already logged in, redirect them away from Login to Home
  if (to.name === APP_ROUTES.LOGIN.name && authStore.isAuthenticated()) {
    return { name: APP_ROUTES.HOME.name }
  }
})

export default router
