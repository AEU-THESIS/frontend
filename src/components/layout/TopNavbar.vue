<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { APP_ROUTES } from '@/constants/appRoutes'

const { t } = useI18n()
const route = useRoute()

const pageTitle = computed(() => {
  switch (route.name) {
    case APP_ROUTES.STAFF.name:
      return t('staff.title')
    case APP_ROUTES.CATEGORIES.name:
    case APP_ROUTES.HOME.name:
      return t('navbar.menuManagement')
    case APP_ROUTES.ORDERS.name:
      return t('sidebar.items.orders')
    case APP_ROUTES.DASHBOARD.name:
      return t('sidebar.items.dashboard')
    case APP_ROUTES.INVENTORY.name:
      return t('sidebar.items.inventory')
    case APP_ROUTES.SALE_REPORTS.name:
      return t('sidebar.items.saleReports')
    case APP_ROUTES.ANALYTICS.name:
      return t('sidebar.items.analytics')
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
</script>

<template>
  <header
    class="min-h-16 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between px-8 py-3 shrink-0"
  >
    <div>
      <h2 class="font-bold text-stone-800 dark:text-stone-50 text-lg leading-tight">
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
      <button
        class="w-10 h-10 rounded-full flex items-center justify-center text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
      >
        <span class="material-symbols-outlined text-[22px]">settings</span>
      </button>
      <div
        class="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden ml-2 cursor-pointer ring-2 ring-transparent hover:ring-amber-700 transition-all"
      >
        <img
          src="https://i.pravatar.cc/150?u=a042581f4e29026704d"
          alt="Profile"
          class="w-full h-full object-cover"
        />
      </div>
    </div>
  </header>
</template>
