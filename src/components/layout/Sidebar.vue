<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/store/useAuthStore'
import { APP_ROUTES } from '@/constants/appRoutes'
import { ROLES, type RoleType } from '@/constants/roles'
import { useShopSettingsStore } from '@/store/useShopSettingsStore'
import logoImg from '@/assets/shop-logo-bg.png'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const shopSettingsStore = useShopSettingsStore()

// A nav item stays highlighted on its own route and on any sub-page that belongs
// to it (e.g. an item's Stock History lives under the Inventory section).
const INVENTORY_CHILD_ROUTES: string[] = [APP_ROUTES.INVENTORY_HISTORY.name]
const isNavItemActive = (routeName: string) => {
  if (route.name === routeName) return true
  if (routeName === APP_ROUTES.INVENTORY.name) {
    return INVENTORY_CHILD_ROUTES.includes(route.name as string)
  }
  return false
}

const handleLogout = async () => {
  await authStore.logout()
  toast.success(t('auth.logoutSuccess'))
  router.push({ name: APP_ROUTES.LOGIN.name })
}

// Default to expanded on desktop, collapsed on mobile
const isCollapsed = ref(false)

const checkWindowSize = () => {
  if (window.innerWidth < 768) {
    isCollapsed.value = true
  } else {
    isCollapsed.value = false
  }
}

onMounted(() => {
  checkWindowSize()
  window.addEventListener('resize', checkWindowSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkWindowSize)
})

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}

const navSections = computed(() => {
  const KNOWN_ROLES: RoleType[] = [ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER]
  const rawRole = authStore.user?.role
  const userRole: RoleType = KNOWN_ROLES.includes(rawRole as RoleType)
    ? (rawRole as RoleType)
    : ROLES.CASHIER

  const sections = [
    {
      titleKey: 'sidebar.sections.home',
      roles: [ROLES.ADMIN, ROLES.MANAGER],
      items: [
        { nameKey: 'sidebar.items.dashboard', route: APP_ROUTES.DASHBOARD, icon: 'grid_view' },
      ],
    },
    {
      titleKey: 'sidebar.sections.pos',
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
      titleKey: 'sidebar.sections.inventory',
      roles: [ROLES.ADMIN, ROLES.MANAGER],
      items: [
        { nameKey: 'sidebar.items.inventory', route: APP_ROUTES.INVENTORY, icon: 'inventory_2' },
        { nameKey: 'sidebar.items.categories', route: APP_ROUTES.CATEGORIES, icon: 'category' },
        { nameKey: 'sidebar.items.products', route: APP_ROUTES.PRODUCT, icon: 'inventory_2' },
      ],
    },
    {
      titleKey: 'sidebar.sections.marketing',
      roles: [ROLES.ADMIN, ROLES.MANAGER],
      items: [
        { nameKey: 'sidebar.items.promotions', route: APP_ROUTES.PROMOTIONS, icon: 'campaign' },
      ],
    },
    {
      titleKey: 'sidebar.sections.reports',
      roles: [ROLES.ADMIN, ROLES.MANAGER],
      items: [
        {
          nameKey: 'sidebar.items.saleReports',
          route: APP_ROUTES.SALE_REPORTS,
          icon: 'receipt_long',
        },
        // Staff management stays Admin-only even though Managers can see this section.
        {
          nameKey: 'sidebar.items.staff',
          route: APP_ROUTES.STAFF,
          icon: 'groups',
          roles: [ROLES.ADMIN],
        },
      ],
    },
    {
      titleKey: 'sidebar.sections.settings',
      roles: [ROLES.ADMIN],
      items: [
        {
          nameKey: 'sidebar.items.config',
          route: APP_ROUTES.SETTINGS,
          icon: 'settings',
        },
      ],
    },
  ]

  // A missing roles list means "visible to every authenticated user".
  const canAccess = (roles?: RoleType[]) => !roles || roles.includes(userRole)

  // Filter at the section level, then within each surviving section filter items
  // by their own optional roles, and drop any section left with no visible items.
  return sections
    .filter(section => canAccess(section.roles as RoleType[] | undefined))
    .map(section => ({
      ...section,
      items: section.items.filter(item => canAccess((item as { roles?: RoleType[] }).roles)),
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
      'hidden md:flex flex-col h-full py-6 bg-stone-100 dark:bg-stone-950 shrink-0 border-r border-stone-200 dark:border-stone-800 transition-all duration-300',
      isCollapsed ? 'w-[88px] items-center px-0' : 'w-64 px-0',
    ]"
  >
    <!-- Logo Area -->
    <div
      class="flex items-center gap-3 mb-8 cursor-pointer hover:opacity-80 transition-opacity"
      :class="isCollapsed ? 'px-0 justify-center' : 'px-6'"
      @click="toggleSidebar"
    >
      <img
        :src="logoImg"
        class="w-12 h-12 rounded-xl object-cover shrink-0"
        :alt="t('sidebar.shop_logo')"
      />
      <div v-if="!isCollapsed" class="overflow-hidden whitespace-nowrap">
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
          class="font-bold text-stone-800 dark:text-stone-50 mb-2 uppercase tracking-wide"
          :class="isCollapsed ? 'text-[9px] text-center w-full px-1 leading-tight' : 'text-sm px-6'"
        >
          {{ t(section.titleKey) }}
        </h3>

        <!-- Section Items -->
        <div class="flex flex-col gap-1 w-full" :class="isCollapsed ? 'px-2' : 'pr-4'">
          <router-link
            v-for="item in section.items"
            :key="item.nameKey"
            :to="item.route"
            class="flex transition-all duration-200 border-l-4 relative group"
            :class="[
              isCollapsed
                ? 'flex-col items-center justify-center py-2.5 px-1 rounded-xl'
                : 'items-center gap-3 py-3 px-6 rounded-r-xl',
              isNavItemActive(item.route.name)
                ? 'bg-[#fcf3eb] dark:bg-amber-900/20 text-[#b05a18] dark:text-amber-500 border-[#b05a18] dark:border-amber-500'
                : 'border-transparent text-stone-500 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800/50',
            ]"
          >
            <span
              class="material-symbols-outlined transition-transform group-hover:scale-110"
              :class="isCollapsed ? 'text-2xl mb-1' : 'text-xl'"
              :data-icon="item.icon"
            >
              {{ item.icon }}
            </span>
            <span
              class="font-semibold transition-all"
              :class="
                isCollapsed
                  ? 'text-[10px] leading-tight mt-0.5 text-center break-words w-full px-1'
                  : 'text-[15px] text-left'
              "
            >
              {{ t(item.nameKey) }}
            </span>
          </router-link>
        </div>
      </div>
    </nav>

    <!-- Bottom Actions -->
    <div
      class="mt-auto flex flex-col w-full pt-6 border-t border-stone-200 dark:border-stone-800"
      :class="isCollapsed ? 'px-2 gap-2' : 'pr-4 gap-1'"
    >
      <a
        class="flex transition-all duration-200 border-l-4 border-transparent text-stone-500 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 cursor-pointer group"
        :class="
          isCollapsed
            ? 'flex-col items-center justify-center py-2.5 px-1 rounded-xl'
            : 'items-center gap-3 py-3 px-6 rounded-r-xl'
        "
      >
        <span
          class="material-symbols-outlined transition-transform group-hover:scale-110"
          :class="isCollapsed ? 'text-2xl mb-1' : 'text-xl'"
          data-icon="help_outline"
          >help_outline</span
        >
        <span
          class="font-semibold"
          :class="
            isCollapsed
              ? 'text-[10px] leading-tight mt-0.5 text-center break-words w-full px-1'
              : 'text-[15px] text-left'
          "
          >{{ t('sidebar.help') }}</span
        >
      </a>
      <a
        class="flex transition-all duration-200 border-l-4 border-transparent text-stone-500 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 cursor-pointer group"
        :class="
          isCollapsed
            ? 'flex-col items-center justify-center py-2.5 px-1 rounded-xl'
            : 'items-center gap-3 py-3 px-6 rounded-r-xl'
        "
        @click.prevent="handleLogout"
      >
        <span
          class="material-symbols-outlined transition-transform group-hover:scale-110"
          :class="isCollapsed ? 'text-2xl mb-1' : 'text-xl'"
          data-icon="logout"
          >logout</span
        >
        <span
          class="font-semibold"
          :class="
            isCollapsed
              ? 'text-[10px] leading-tight mt-0.5 text-center break-words w-full px-1'
              : 'text-[15px] text-left'
          "
          >{{ t('sidebar.logout') }}</span
        >
      </a>
    </div>
  </aside>
</template>
