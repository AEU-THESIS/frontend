<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useStorage } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/store/useAuthStore'
import { APP_ROUTES } from '@/constants/appRoutes'
import { ROLES, type RoleType } from '@/constants/roles'
import { useShopSettingsStore } from '@/store/useShopSettingsStore'
import { Button } from '@/components/ui/button'
import ExportSalesSummaryDialog from '@/components/reports/ExportSalesSummaryDialog.vue'
import type { SidebarNavItem, SidebarSection } from '@/types/sidebar.types'
import logoImg from '@/assets/shop-logo-bg.png'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const shopSettingsStore = useShopSettingsStore()

// A nav item stays highlighted on its own route and on any sub-page that belongs
// to it (e.g. an item's Stock History lives under the Inventory section).
const isNavItemActive = (item: SidebarNavItem) => {
  if (!item.route) return false
  if (route.name === item.route.name) return true
  return (item.childRoutes ?? []).includes(route.name as string)
}

const handleLogout = async () => {
  await authStore.logout()
  toast.success(t('auth.logoutSuccess'))
  router.push({ name: APP_ROUTES.LOGIN.name })
}

// Collapsing to the icon rail is a deliberate choice, so it survives reloads.
// It is deliberately NOT tied to the viewport: the whole sidebar is hidden below
// `md`, so reacting to resize only ever undid what the user picked.
const isCollapsed = useStorage('sidebar-collapsed', false)

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}

// --- Sidebar-owned actions (rows that do something instead of navigating) ---
const isExcelDialogOpen = ref(false)

// The export dialog takes a range and opens on the shop's today, so a
// single-day export stays one click.
const todayIsoDate = new Intl.DateTimeFormat('en-CA').format(new Date())

const runAction = (item: SidebarNavItem) => {
  if (item.action === 'exportExcel') isExcelDialogOpen.value = true
}

// Rows look identical whether they navigate or run an action, so both branches
// of the template share these classes.
const rowClass = (active: boolean) => [
  'flex w-full items-center border-l-4 relative group overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out',
  isCollapsed.value ? 'justify-center gap-0 py-2.5 px-1' : 'gap-3 py-3 px-6 rounded-r-xl',
  active
    ? 'bg-[#fcf3eb] dark:bg-amber-900/20 text-[#b05a18] dark:text-amber-500 border-[#b05a18] dark:border-amber-500'
    : 'border-transparent text-stone-500 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800/50',
]

const navSections = computed<SidebarSection[]>(() => {
  const KNOWN_ROLES: RoleType[] = [ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER]
  const rawRole = authStore.user?.role
  const userRole: RoleType = KNOWN_ROLES.includes(rawRole as RoleType)
    ? (rawRole as RoleType)
    : ROLES.CASHIER

  const sections: SidebarSection[] = [
    {
      titleKey: 'sidebar.sections.overview',
      roles: [ROLES.ADMIN, ROLES.MANAGER],
      items: [
        { nameKey: 'sidebar.items.dashboard', route: APP_ROUTES.DASHBOARD, icon: 'grid_view' },
      ],
    },
    {
      titleKey: 'sidebar.sections.sales',
      roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER],
      items: [
        { nameKey: 'sidebar.items.pos', route: APP_ROUTES.HOME, icon: 'point_of_sale' },
        ...(shopSettingsStore.is_order_management_enabled
          ? [{ nameKey: 'sidebar.items.orders', route: APP_ROUTES.ORDERS, icon: 'receipt_long' }]
          : []),
        { nameKey: 'sidebar.items.orderHistory', route: APP_ROUTES.ORDER_HISTORY, icon: 'history' },
      ],
    },
    {
      titleKey: 'sidebar.sections.menu',
      roles: [ROLES.ADMIN, ROLES.MANAGER],
      items: [
        { nameKey: 'sidebar.items.categories', route: APP_ROUTES.CATEGORIES, icon: 'category' },
        { nameKey: 'sidebar.items.products', route: APP_ROUTES.PRODUCT, icon: 'fastfood' },
        { nameKey: 'sidebar.items.promotions', route: APP_ROUTES.PROMOTIONS, icon: 'campaign' },
      ],
    },
    {
      titleKey: 'sidebar.sections.inventory',
      roles: [ROLES.ADMIN, ROLES.MANAGER],
      items: [
        {
          nameKey: 'sidebar.items.inventory',
          route: APP_ROUTES.INVENTORY,
          icon: 'inventory_2',
          childRoutes: [APP_ROUTES.INVENTORY_HISTORY.name],
        },
        {
          nameKey: 'sidebar.items.inventoryExpenseReport',
          route: APP_ROUTES.INVENTORY_EXPENSE_REPORT,
          icon: 'receipt_long',
        },
      ],
    },
    {
      // The reporting pages, grouped like every other section. The last row runs
      // the export dialog instead of navigating.
      titleKey: 'sidebar.sections.reports',
      roles: [ROLES.ADMIN, ROLES.MANAGER],
      items: [
        { nameKey: 'sidebar.items.dailySummary', route: APP_ROUTES.SALE_REPORTS, icon: 'today' },
        {
          nameKey: 'sidebar.items.salesReport',
          route: APP_ROUTES.SALES_REPORT,
          icon: 'trending_up',
        },
        {
          nameKey: 'sidebar.items.productPerformance',
          route: APP_ROUTES.PRODUCT_PERFORMANCE,
          icon: 'local_cafe',
        },
        { nameKey: 'sidebar.items.exportExcel', action: 'exportExcel', icon: 'download' },
      ],
    },
    {
      // Section is visible to Managers too, but both items stay Admin-only, so a
      // Manager ends up with no visible items and the section is dropped below.
      titleKey: 'sidebar.sections.administration',
      roles: [ROLES.ADMIN, ROLES.MANAGER],
      items: [
        {
          nameKey: 'sidebar.items.staff',
          route: APP_ROUTES.STAFF,
          icon: 'groups',
          roles: [ROLES.ADMIN],
        },
        {
          nameKey: 'sidebar.items.config',
          route: APP_ROUTES.SETTINGS,
          icon: 'settings',
          roles: [ROLES.ADMIN],
        },
      ],
    },
  ]

  // A missing roles list means "visible to every authenticated user".
  const canAccess = (roles?: RoleType[]) => !roles || roles.includes(userRole)

  // Filter at the section level, then within each surviving section filter items
  // by their own optional roles, and drop any section left with no visible items.
  return sections
    .filter(section => canAccess(section.roles))
    .map(section => ({
      ...section,
      items: section.items.filter(item => canAccess(item.roles)),
    }))
    .filter(section => section.items.length > 0)
})

const shopDisplayName = computed(() => {
  const name = shopSettingsStore.shop_name || t('sidebar.your_shop')
  const idx = name.indexOf(' ')
  if (idx !== -1) {
    return {
      top: name.substring(0, idx),
      bottom: name.substring(idx + 1),
    }
  }
  return {
    top: name,
    bottom: t('sidebar.station'),
  }
})
</script>

<template>
  <aside
    :class="[
      'hidden md:flex flex-col h-full py-6 px-0 bg-stone-100 dark:bg-stone-950 shrink-0 border-r border-stone-200 dark:border-stone-800 overflow-hidden transition-[width] duration-300 ease-in-out',
      isCollapsed ? 'w-[88px] items-center' : 'w-64',
    ]"
  >
    <!-- Logo Area -->
    <div
      class="flex items-center mb-8 cursor-pointer hover:opacity-80 transition-all duration-300 ease-in-out"
      :class="isCollapsed ? 'px-0 gap-0 justify-center' : 'px-6 gap-3'"
      @click="toggleSidebar"
    >
      <img
        :src="logoImg"
        class="w-12 h-12 rounded-xl object-cover shrink-0"
        :alt="t('sidebar.shop_logo')"
      />
      <!-- Collapsing labels stay mounted and animate their width/opacity; a v-if
           would pop them in and out mid-transition. -->
      <div
        class="overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out"
        :class="isCollapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-[160px]'"
      >
        <h2
          class="font-bold text-stone-800 dark:text-stone-50 font-headline tracking-tight text-lg leading-tight"
        >
          {{ shopDisplayName.top }}
        </h2>
        <p class="text-[13px] text-stone-500 dark:text-stone-400 font-medium leading-tight mt-0.5">
          {{ shopDisplayName.bottom }}
        </p>
      </div>
    </div>

    <!-- Navigation Links -->
    <nav class="flex-1 flex flex-col w-full overflow-y-auto overflow-x-hidden scrollbar-hide">
      <div
        v-for="(section, index) in navSections"
        :key="index"
        class="mb-6 w-full flex flex-col"
        :class="isCollapsed ? 'items-center' : ''"
      >
        <!-- Section Title -->
        <h3
          class="font-bold text-stone-800 dark:text-stone-50 mb-2 uppercase tracking-wide leading-tight transition-all duration-300 ease-in-out"
          :class="isCollapsed ? 'text-[9px] text-center w-full px-1' : 'text-sm px-6'"
        >
          {{ t(section.titleKey) }}
        </h3>

        <!-- Section Items -->
        <div
          class="flex flex-col gap-1 w-full transition-all duration-300 ease-in-out"
          :class="isCollapsed ? 'px-2' : 'pr-4'"
        >
          <template v-for="item in section.items" :key="item.nameKey">
            <router-link
              v-if="item.route"
              :to="item.route"
              :title="isCollapsed ? t(item.nameKey) : undefined"
              :class="rowClass(isNavItemActive(item))"
            >
              <span
                class="material-symbols-outlined shrink-0 transition-all duration-300 ease-in-out group-hover:scale-110"
                :class="isCollapsed ? 'text-2xl' : 'text-xl'"
                :data-icon="item.icon"
              >
                {{ item.icon }}
              </span>
              <span
                class="font-semibold text-[15px] text-left overflow-hidden transition-all duration-300 ease-in-out"
                :class="isCollapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-[160px]'"
              >
                {{ t(item.nameKey) }}
              </span>
            </router-link>

            <!-- Action row. Written out rather than resolved through
                 `<component :is>`: `Button` is registered globally, so a dynamic
                 'button' would resolve to it and pick up its primary styling. -->
            <button
              v-else
              type="button"
              :title="isCollapsed ? t(item.nameKey) : undefined"
              :class="rowClass(false)"
              @click="runAction(item)"
            >
              <span
                class="material-symbols-outlined shrink-0 transition-all duration-300 ease-in-out group-hover:scale-110"
                :class="isCollapsed ? 'text-2xl' : 'text-xl'"
                :data-icon="item.icon"
              >
                {{ item.icon }}
              </span>
              <span
                class="font-semibold text-[15px] text-left overflow-hidden transition-all duration-300 ease-in-out"
                :class="isCollapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-[160px]'"
              >
                {{ t(item.nameKey) }}
              </span>
            </button>
          </template>
        </div>
      </div>
    </nav>

    <!-- Bottom Actions -->
    <div
      class="mt-auto flex flex-col w-full pt-6 border-t border-stone-200 dark:border-stone-800 transition-all duration-300 ease-in-out"
      :class="isCollapsed ? 'px-2 gap-2' : 'pr-4 gap-1'"
    >
      <Button
        variant="ghost"
        type="button"
        :title="isCollapsed ? t('sidebar.logout') : undefined"
        class="flex items-center h-auto border-l-4 border-transparent text-stone-500 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 cursor-pointer group overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out"
        :class="
          isCollapsed
            ? 'justify-center gap-0 py-2.5 px-1 rounded-none'
            : 'justify-start gap-3 py-3 px-6 rounded-l-none rounded-r-xl'
        "
        @click="handleLogout"
      >
        <span
          class="material-symbols-outlined shrink-0 transition-all duration-300 ease-in-out group-hover:scale-110"
          :class="isCollapsed ? 'text-2xl' : 'text-xl'"
          data-icon="logout"
          >logout</span
        >
        <span
          class="font-semibold text-[15px] text-left overflow-hidden transition-all duration-300 ease-in-out"
          :class="isCollapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-[160px]'"
          >{{ t('sidebar.logout') }}</span
        >
      </Button>
    </div>

    <ExportSalesSummaryDialog
      v-model:open="isExcelDialogOpen"
      :default-date="todayIsoDate"
      :max-date="todayIsoDate"
    />
  </aside>
</template>
