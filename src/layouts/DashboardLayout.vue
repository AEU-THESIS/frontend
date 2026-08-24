<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { APP_ROUTES } from '@/constants/appRoutes'
import CartSidebar from '@/components/cart/CartSidebar.vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import TopNavbar from '@/components/layout/TopNavbar.vue'
import { getShopSettings } from '@/api/shop'
import { useShopSettingsStore } from '@/store/useShopSettingsStore'

const route = useRoute()
const { t } = useI18n()
const shopSettingsStore = useShopSettingsStore()

onMounted(async () => {
  try {
    const settings = await getShopSettings()
    shopSettingsStore.setShopSettings(settings)
  } catch (error) {
    // Surface the failure instead of silently falling back to defaults
    // (which would show the wrong currency/rate and hide the Orders menu).
    console.error('Failed to load shop settings:', error)
    toast.error(t('settings.messages.loadError'))
  }
})
</script>

<template>
  <div
    class="bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-50 h-screen overflow-hidden flex"
  >
    <Sidebar />

    <main class="flex flex-col flex-1 overflow-hidden bg-stone-50 dark:bg-stone-900">
      <TopNavbar />

      <div class="flex flex-1 overflow-hidden">
        <!-- Main Content Area -->
        <section
          class="flex flex-col h-full overflow-hidden"
          :class="route.name === APP_ROUTES.HOME.name ? 'w-[65%]' : 'w-full'"
        >
          <router-view />
        </section>

        <!-- Right Side: Order Cart (Conditional) -->
        <CartSidebar v-if="route.name === APP_ROUTES.HOME.name" />
      </div>
    </main>
  </div>
</template>
