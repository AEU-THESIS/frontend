<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useStorage } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent } from 'reka-ui'
import { useAuthStore } from '@/store/useAuthStore'
import { APP_ROUTES } from '@/constants/appRoutes'
import { ROLES, type RoleType } from '@/constants/roles'
import { useShopSettingsStore } from '@/store/useShopSettingsStore'
import { Button } from '@/components/ui/button'
import SidebarChildLink from '@/components/layout/SidebarChildLink.vue'
import ExportSalesSummaryDialog from '@/components/reports/ExportSalesSummaryDialog.vue'
import type { SidebarNavItem, SidebarNavLeaf, SidebarSection } from '@/types/sidebar.types'
import logoImg from '@/assets/shop-logo-bg.png'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const shopSettingsStore = useShopSettingsStore()

// A nav item stays highlighted on its own route and on any sub-page that belongs
// to it (e.g. an item's Stock History lives under the Inventory section).
const isNavItemActive = (item: SidebarNavLeaf) => {
  if (!item.route) return false
  if (route.name === item.route.name) return true
  return (item.childRoutes ?? []).includes(route.name as string)
}

/** A submenu parent stays highlighted while any of its children is open. */
const isParentActive = (item: SidebarNavItem) =>
  (item.children ?? []).some(child => isNavItemActive(child))

const handleLogout = async () => {
  await authStore.logout()
  toast.success(t('auth.logoutSuccess'))
  router.push({ name: APP_ROUTES.LOGIN.name })
}

// Collapsing to the icon rail is a deliberate choice, so it survives reloads.
// It is deliberately NOT tied to the viewport: the whole sidebar is hidden below
// `md`, so reacting to resize only ever undid what the user picked.
const isCollapsed = useStorage('sidebar-collapsed', false)

/** Names of the submenus the user has open, so they reopen after a reload. */
const openMenus = useStorage<string[]>('sidebar-open-menus', [])

const isMenuOpen = (item: SidebarNavItem) => openMenus.value.includes(item.nameKey)

const toggleMenu = (item: SidebarNavItem) => {
  openMenus.value = isMenuOpen(item)
    ? openMenus.value.filter(key => key !== item.nameKey)
    : [...openMenus.value, item.nameKey]
}

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}

// --- Sidebar-owned actions (rows that do something instead of navigating) ---
const isExcelDialogOpen = ref(false)

// The export dialog takes a range and opens on the shop's today, so a
// single-day export stays one click.
const todayIsoDate = new Intl.DateTimeFormat('en-CA').format(new Date())

/** Which submenu's pop-out is showing on the collapsed rail, if any. */
const openPopout = ref<string | null>(null)

// Picking anything from a pop-out dismisses it, whether the row navigates or
// runs an action — leaving the panel hovering over the new page reads as stuck.
const selectChild = (item: SidebarNavLeaf) => {
  openPopout.value = null
  if (item.action === 'exportExcel') isExcelDialogOpen.value = true
}

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
      // The Sale submenu is its own group and carries no section title — the
      // parent row already reads "Sale", so a heading above it would repeat it.
      roles: [ROLES.ADMIN, ROLES.MANAGER],
      items: [
        {
          nameKey: 'sidebar.items.sale',
          icon: 'summarize',
          children: [
            {
              nameKey: 'sidebar.items.dailySummary',
              route: APP_ROUTES.SALE_REPORTS,
              icon: 'today',
            },
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
            {
              nameKey: 'sidebar.items.exportExcel',
              action: 'exportExcel',
              icon: 'download',
            },
          ],
        },
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
  // by their own optional roles, dropping any submenu left with no visible
  // children and any section left with no visible items.
  return sections
    .filter(section => canAccess(section.roles))
    .map(section => ({
      ...section,
      items: section.items
        .filter(item => canAccess(item.roles))
        .map(item =>
          item.children
            ? { ...item, children: item.children.filter(child => canAccess(child.roles)) }
            : item
        )
        .filter(item => !item.children || item.children.length > 0),
    }))
    .filter(section => section.items.length > 0)
})

// Landing on a report URL directly (bookmark, refresh, deep link) should reveal
// where that page lives, so its parent opens itself.
watch(
  () => route.name,
  () => {
    const activeParents = navSections.value
      .flatMap(section => section.items)
      .filter(item => item.children?.length && isParentActive(item))
      .map(item => item.nameKey)
      .filter(key => !openMenus.value.includes(key))

    if (activeParents.length) openMenus.value = [...openMenus.value, ...activeParents]
  },
  { immediate: true }
)

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
          v-if="section.titleKey"
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
            <!-- Submenu parent, collapsed rail: an indented list would be
                 unreadable at 88px, so the children open in a pop-out. -->
            <PopoverRoot
              v-if="item.children && isCollapsed"
              :open="openPopout === item.nameKey"
              @update:open="value => (openPopout = value ? item.nameKey : null)"
            >
              <PopoverTrigger as-child>
                <button
                  type="button"
                  :title="t(item.nameKey)"
                  class="flex items-center justify-center gap-0 border-l-4 relative group overflow-hidden whitespace-nowrap py-2.5 px-1 w-full transition-all duration-300 ease-in-out"
                  :class="
                    isParentActive(item)
                      ? 'bg-[#fcf3eb] dark:bg-amber-900/20 text-[#b05a18] dark:text-amber-500 border-[#b05a18] dark:border-amber-500'
                      : 'border-transparent text-stone-500 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800/50'
                  "
                >
                  <span
                    class="material-symbols-outlined shrink-0 text-2xl transition-all duration-300 ease-in-out group-hover:scale-110"
                    :data-icon="item.icon"
                  >
                    {{ item.icon }}
                  </span>
                </button>
              </PopoverTrigger>

              <PopoverPortal>
                <PopoverContent
                  side="right"
                  align="start"
                  :side-offset="8"
                  class="z-50 w-56 rounded-xl border border-stone-200 bg-white p-2 shadow-lg dark:border-stone-800 dark:bg-stone-900"
                >
                  <p
                    class="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500"
                  >
                    {{ t(item.nameKey) }}
                  </p>
                  <SidebarChildLink
                    v-for="child in item.children"
                    :key="child.nameKey"
                    :item="child"
                    :active="isNavItemActive(child)"
                    variant="popout"
                    @select="selectChild"
                  />
                </PopoverContent>
              </PopoverPortal>
            </PopoverRoot>

            <!-- Submenu parent, expanded sidebar -->
            <template v-else-if="item.children">
              <button
                type="button"
                :aria-expanded="isMenuOpen(item)"
                class="flex items-center gap-3 border-l-4 relative group overflow-hidden whitespace-nowrap py-3 pl-6 pr-4 rounded-r-xl w-full transition-all duration-300 ease-in-out"
                :class="
                  isParentActive(item)
                    ? 'bg-[#fcf3eb] dark:bg-amber-900/20 text-[#b05a18] dark:text-amber-500 border-[#b05a18] dark:border-amber-500'
                    : 'border-transparent text-stone-500 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800/50'
                "
                @click="toggleMenu(item)"
              >
                <span
                  class="material-symbols-outlined shrink-0 text-xl transition-all duration-300 ease-in-out group-hover:scale-110"
                  :data-icon="item.icon"
                >
                  {{ item.icon }}
                </span>
                <!-- The submenu parent reads as a group heading, so its label
                     keeps the section-title weight and colour rather than the
                     muted grey the child rows use. -->
                <span
                  class="flex-1 text-left text-[15px] font-bold text-stone-800 dark:text-stone-50"
                >
                  {{ t(item.nameKey) }}
                </span>
                <span
                  class="material-symbols-outlined shrink-0 text-lg transition-transform duration-300 ease-in-out"
                  :class="isMenuOpen(item) ? 'rotate-180' : ''"
                  data-icon="expand_more"
                  >expand_more</span
                >
              </button>

              <div v-if="isMenuOpen(item)" class="flex flex-col gap-0.5 pt-1">
                <SidebarChildLink
                  v-for="child in item.children"
                  :key="child.nameKey"
                  :item="child"
                  :active="isNavItemActive(child)"
                  variant="inline"
                  @select="selectChild"
                />
              </div>
            </template>

            <!-- Plain link -->
            <router-link
              v-else-if="item.route"
              :to="item.route"
              :title="isCollapsed ? t(item.nameKey) : undefined"
              class="flex items-center border-l-4 relative group overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out"
              :class="[
                isCollapsed ? 'justify-center gap-0 py-2.5 px-1' : 'gap-3 py-3 px-6 rounded-r-xl',
                isNavItemActive(item)
                  ? 'bg-[#fcf3eb] dark:bg-amber-900/20 text-[#b05a18] dark:text-amber-500 border-[#b05a18] dark:border-amber-500'
                  : 'border-transparent text-stone-500 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800/50',
              ]"
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
