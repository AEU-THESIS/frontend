<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { usePublicShopStore } from '@/store/usePublicShopStore'
import { useTelegram } from '@/composables/useTelegram'
import { APP_ROUTES } from '@/constants/appRoutes'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const shopStore = usePublicShopStore()
const tg = useTelegram()

const orderNumber = computed(() => String(route.params.orderNumber ?? ''))
// Optional café Telegram contact (e.g. https://t.me/routincafe). Hidden if unset.
const cafeTelegram = import.meta.env.VITE_CAFE_TELEGRAM_URL as string | undefined

const goMenu = () =>
  router.push({ name: APP_ROUTES.PUBLIC_MENU.name, params: { slug: shopStore.slug } })
const goMyOrders = () =>
  router.push({ name: APP_ROUTES.PUBLIC_MY_ORDERS.name, params: { slug: shopStore.slug } })

onMounted(() => tg.notify('success'))
</script>

<template>
  <div class="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
    <div class="success-badge relative flex h-20 w-20 items-center justify-center">
      <span class="success-ring absolute inset-0 rounded-full bg-emerald-400/30"></span>
      <span
        class="success-pop relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40"
      >
        <span class="material-symbols-outlined text-4xl text-emerald-600">check_circle</span>
      </span>
    </div>

    <div class="fade-up">
      <h1 class="text-2xl font-extrabold text-stone-900 dark:text-stone-50">
        {{ t('publicOrder.orderPlaced') }}
      </h1>
      <p class="mt-1 text-sm text-stone-500 dark:text-stone-400">
        {{ t('publicOrder.orderPlacedMessage') }}
      </p>
    </div>

    <div
      class="fade-up rounded-2xl bg-stone-100 px-6 py-3 dark:bg-stone-800"
      style="animation-delay: 80ms"
    >
      <p class="text-[11px] font-bold uppercase tracking-wider text-stone-400">
        {{ t('publicOrder.orderNumber') }}
      </p>
      <p class="text-lg font-extrabold text-stone-900 dark:text-stone-50">{{ orderNumber }}</p>
    </div>

    <div class="fade-up mt-2 flex w-full max-w-xs flex-col gap-2" style="animation-delay: 160ms">
      <a v-if="cafeTelegram" :href="cafeTelegram" target="_blank" rel="noopener" class="w-full">
        <Button class="h-auto w-full rounded-xl py-3 font-bold">
          <span class="material-symbols-outlined">send</span>
          {{ t('publicOrder.messageUs') }}
        </Button>
      </a>
      <Button
        variant="secondary"
        class="h-auto w-full rounded-xl py-3 font-bold"
        @click="goMyOrders"
      >
        {{ t('publicOrder.viewMyOrders') }}
      </Button>
      <Button variant="tertiary" class="w-full" @click="goMenu">
        {{ t('publicOrder.backToMenu') }}
      </Button>
    </div>
  </div>
</template>

<style scoped>
.success-pop {
  animation: pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.success-ring {
  animation: ring 0.9s ease-out 0.15s both;
}
.fade-up {
  animation: fadeUp 0.4s ease both;
}
@keyframes pop {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  60% {
    transform: scale(1.08);
    opacity: 1;
  }
  100% {
    transform: scale(1);
  }
}
@keyframes ring {
  0% {
    transform: scale(0.8);
    opacity: 0.6;
  }
  100% {
    transform: scale(1.9);
    opacity: 0;
  }
}
@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
