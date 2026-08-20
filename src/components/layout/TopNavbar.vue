<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { APP_ROUTES } from '@/constants/appRoutes'
import { useAuthStore } from '@/store/useAuthStore'
import { ROLES } from '@/constants/roles'
import SystemPreferenceDialog from '@/components/layout/SystemPreferenceDialog.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isProfileMenuOpen = ref(false)
const isSystemSettingsOpen = ref(false)

const pageTitle = computed(() => {
  switch (route.name) {
    case APP_ROUTES.STAFF.name:
      return t('staff.title')
    case APP_ROUTES.CATEGORIES.name:
    case APP_ROUTES.HOME.name:
      return t('navbar.menuManagement')
    case APP_ROUTES.ORDERS.name:
      return t('orderDashboard.title')
    case APP_ROUTES.ORDER_HISTORY.name:
      return t('orderHistory.title')
    case APP_ROUTES.DASHBOARD.name:
      return t('sidebar.items.dashboard')
    case APP_ROUTES.INVENTORY.name:
      return t('sidebar.items.inventory')
    case APP_ROUTES.INVENTORY_HISTORY.name:
      return t('inventory.history.title')
    case APP_ROUTES.SALE_REPORTS.name:
      return t('sidebar.items.saleReports')
    case APP_ROUTES.PRODUCT.name:
      return t('menuManagement.title')
    default:
      return t('app.title')
  }
})

const pageSubtitle = computed(() => {
  if (route.name === APP_ROUTES.INVENTORY.name) {
    return t('inventory.subtitle')
  }

  return ''
})
const userInitials = computed(() => {
  const name = authStore.user?.name
  if (!name) return 'U' // fallback
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
})

const isAdmin = computed(() => authStore.user?.role === ROLES.ADMIN)

const openSystemSettings = () => {
  isSystemSettingsOpen.value = true
  isProfileMenuOpen.value = false
}

const goToShopSetting = () => {
  isProfileMenuOpen.value = false
  router.push({ name: APP_ROUTES.SETTINGS.name })
}

const getProfileImageUrl = (path: string | undefined | null) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  const baseUrl = import.meta.env.VITE_API_URL || ''
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}
</script>

<template>
  <header
    class="h-16 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between px-8 shrink-0 relative z-30"
  >
    <div>
      <h2 class="font-bold text-stone-800 dark:text-stone-50 text-[24px] leading-tight">
        {{ pageTitle }}
      </h2>
      <p v-if="pageSubtitle" class="mt-1 text-sm font-medium text-stone-500 dark:text-stone-400">
        {{ pageSubtitle }}
      </p>
    </div>
    <div class="flex items-center gap-3">
      <button
        class="w-10 h-10 rounded-full flex items-center justify-center text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
      >
        <span class="material-symbols-outlined text-[22px]">notifications</span>
      </button>

      <!-- Profile Dropdown -->
      <div class="relative">
        <!-- Backdrop -->
        <div
          v-if="isProfileMenuOpen"
          class="fixed inset-0 z-40"
          @click="isProfileMenuOpen = false"
        ></div>

        <div
          class="relative z-50 w-9 h-9 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center ml-2 cursor-pointer ring-2 ring-transparent hover:ring-amber-700 transition-all text-stone-700 dark:text-stone-300 font-bold text-[13px] select-none overflow-hidden"
          @click="isProfileMenuOpen = !isProfileMenuOpen"
        >
          <img
            v-if="authStore.user?.image_url || authStore.user?.imageUrl"
            :src="getProfileImageUrl(authStore.user?.image_url || authStore.user?.imageUrl)"
            alt="Profile"
            class="w-full h-full object-cover"
          />
          <span v-else>{{ userInitials }}</span>
        </div>

        <!-- Menu -->
        <div
          v-if="isProfileMenuOpen"
          class="absolute right-0 mt-3 w-56 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div class="px-4 py-3 border-b border-stone-100 dark:border-stone-800">
            <p class="text-sm font-semibold text-stone-800 dark:text-stone-200 truncate">
              {{ authStore.user?.name || 'User' }}
            </p>
            <p class="text-xs text-stone-500 dark:text-stone-400 truncate">
              {{ authStore.user?.role || 'Staff' }}
            </p>
          </div>

          <div class="p-1">
            <button
              class="w-full text-left px-3 py-2.5 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors flex items-center gap-2.5"
              @click="openSystemSettings"
            >
              <span class="material-symbols-outlined text-[18px]">settings_suggest</span>
              {{ t('preferences.title') }}
            </button>
            <button
              v-if="isAdmin"
              class="w-full text-left px-3 py-2.5 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors flex items-center gap-2.5"
              @click="goToShopSetting"
            >
              <span class="material-symbols-outlined text-[18px]">storefront</span>
              {{ t('sidebar.items.config') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- System Preference Dialog -->
  <SystemPreferenceDialog v-model:is-open="isSystemSettingsOpen" />
</template>
