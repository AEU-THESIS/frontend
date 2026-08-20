<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { usePublicShopStore } from '@/store/usePublicShopStore'
import { usePublicCartStore } from '@/store/usePublicCartStore'
import { createPreOrder } from '@/api/publicOrder'
import { APP_ROUTES } from '@/constants/appRoutes'
import { useTelegram } from '@/composables/useTelegram'
import LangFlagToggle from '@/components/public/LangFlagToggle.vue'

const router = useRouter()
const { t } = useI18n()
const shopStore = usePublicShopStore()
const cart = usePublicCartStore()
const tg = useTelegram()

const name = ref('')
const phone = ref('')
const note = ref('')
const lat = ref<number | null>(null)
const lng = ref<number | null>(null)
const locating = ref(false)
const submitting = ref(false)

const currency = computed(() => shopStore.shop?.currencySymbol ?? '$')
const phoneValid = computed(() => /^[+]?[0-9][0-9\s-]{5,19}$/.test(phone.value.trim()))
const canSubmit = computed(() => cart.count > 0 && phoneValid.value && !submitting.value)
const mapsLink = computed(() =>
  lat.value != null && lng.value != null
    ? `https://maps.google.com/?q=${lat.value},${lng.value}`
    : null
)

const optionSummary = (opts: { optionName: string }[]) => opts.map(o => o.optionName).join(', ')

const useLocation = () => {
  if (!navigator.geolocation) {
    toast.error(t('publicOrder.geoUnsupported'))
    return
  }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    pos => {
      lat.value = pos.coords.latitude
      lng.value = pos.coords.longitude
      locating.value = false
      tg.notify('success')
      toast.success(t('publicOrder.locationCaptured'))
    },
    () => {
      locating.value = false
      tg.notify('error')
      toast.error(t('publicOrder.locationDenied'))
    },
    { enableHighAccuracy: true, timeout: 10000 }
  )
}

const goBack = () =>
  router.push({ name: APP_ROUTES.PUBLIC_MENU.name, params: { slug: shopStore.slug } })

const submit = async () => {
  if (!phoneValid.value) {
    tg.notify('error')
    toast.error(t('publicOrder.invalidPhone'))
    return
  }
  submitting.value = true
  try {
    const result = await createPreOrder(shopStore.slug, {
      customerName: name.value.trim() || undefined,
      customerPhone: phone.value.trim(),
      deliveryAddress: note.value.trim() || undefined,
      deliveryLat: lat.value ?? undefined,
      deliveryLng: lng.value ?? undefined,
      items: cart.toPayloadItems(),
    })
    cart.clear()
    tg.notify('success')
    router.push({
      name: APP_ROUTES.PUBLIC_CONFIRMATION.name,
      params: { slug: shopStore.slug, orderNumber: result.orderNumber },
    })
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    tg.notify('error')
    toast.error(err?.response?.data?.message ?? t('publicOrder.submitFailed'))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex flex-1 flex-col pb-28">
    <header
      class="sticky top-0 z-10 flex items-center gap-3 bg-stone-50/90 px-4 py-3 backdrop-blur dark:bg-stone-900/90"
    >
      <button
        class="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
        @click="goBack"
      >
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <h1 class="flex-1 text-lg font-extrabold text-stone-900 dark:text-stone-50">
        {{ t('publicOrder.yourOrder') }}
      </h1>
      <LangFlagToggle />
    </header>

    <!-- Empty -->
    <div
      v-if="cart.count === 0"
      class="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center"
    >
      <span class="material-symbols-outlined text-5xl text-stone-300">shopping_cart</span>
      <p class="text-sm text-stone-400">{{ t('publicOrder.cartEmpty') }}</p>
      <Button variant="secondary" @click="goBack">{{ t('publicOrder.backToMenu') }}</Button>
    </div>

    <template v-else>
      <!-- Cart lines -->
      <section class="space-y-2 px-4 pt-2">
        <div
          v-for="item in cart.items"
          :key="item.cartId"
          class="flex items-center gap-3 rounded-2xl border border-stone-100 bg-white p-3 dark:border-stone-800 dark:bg-stone-800"
        >
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-bold text-stone-800 dark:text-stone-100">
              {{ item.name }}
            </p>
            <p v-if="item.options.length" class="truncate text-xs text-stone-400">
              {{ optionSummary(item.options) }}
            </p>
            <p class="mt-0.5 text-sm font-bold text-primary">
              {{ currency }}{{ item.lineTotal.toFixed(2) }}
            </p>
          </div>
          <div class="flex items-center gap-2 rounded-xl bg-stone-100 p-1 dark:bg-stone-950">
            <button
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-stone-700 dark:bg-stone-700 dark:text-stone-100"
              @click="cart.updateQuantity(item.cartId, item.quantity - 1)"
            >
              <span class="material-symbols-outlined text-sm">remove</span>
            </button>
            <span class="w-5 text-center text-sm font-bold">{{ item.quantity }}</span>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-stone-700 dark:bg-stone-700 dark:text-stone-100"
              @click="cart.updateQuantity(item.cartId, item.quantity + 1)"
            >
              <span class="material-symbols-outlined text-sm">add</span>
            </button>
          </div>
        </div>
      </section>

      <!-- Contact + delivery -->
      <section class="mt-4 space-y-3 px-4">
        <h2 class="text-sm font-bold text-stone-800 dark:text-stone-200">
          {{ t('publicOrder.deliveryDetails') }}
        </h2>

        <input
          v-model="name"
          type="text"
          :placeholder="t('publicOrder.namePlaceholder')"
          class="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary dark:border-stone-700 dark:bg-stone-800"
        />

        <div>
          <input
            v-model="phone"
            type="tel"
            inputmode="tel"
            :placeholder="t('publicOrder.phonePlaceholder')"
            class="w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary dark:bg-stone-800"
            :class="
              phone && !phoneValid ? 'border-red-400' : 'border-stone-200 dark:border-stone-700'
            "
          />
          <p v-if="phone && !phoneValid" class="mt-1 text-xs text-red-500">
            {{ t('publicOrder.invalidPhone') }}
          </p>
        </div>

        <!-- Location -->
        <div
          class="rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-800"
        >
          <button
            type="button"
            class="flex w-full items-center gap-2 text-sm font-bold text-primary disabled:opacity-60"
            :disabled="locating"
            @click="useLocation"
          >
            <span class="material-symbols-outlined" :class="{ 'animate-spin': locating }">
              {{ locating ? 'progress_activity' : 'my_location' }}
            </span>
            {{ mapsLink ? t('publicOrder.locationCaptured') : t('publicOrder.useLocation') }}
          </button>
          <a
            v-if="mapsLink"
            :href="mapsLink"
            target="_blank"
            rel="noopener"
            class="mt-1 block truncate text-xs text-stone-400 underline"
          >
            {{ mapsLink }}
          </a>
          <p class="mt-1 text-xs text-stone-400">{{ t('publicOrder.locationHint') }}</p>
        </div>

        <textarea
          v-model="note"
          rows="2"
          :placeholder="t('publicOrder.addressPlaceholder')"
          class="w-full resize-none rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary dark:border-stone-700 dark:bg-stone-800"
        ></textarea>

        <p
          class="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
        >
          {{ t('publicOrder.paymentNote') }}
        </p>
      </section>
    </template>

    <!-- Sticky submit -->
    <div
      v-if="cart.count > 0"
      class="tg-safe-bottom fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-stone-100 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-900"
    >
      <Button
        class="h-auto w-full rounded-xl py-3.5 font-bold"
        :disabled="!canSubmit"
        @click="submit"
      >
        <span v-if="submitting" class="material-symbols-outlined animate-spin"
          >progress_activity</span
        >
        <span v-else
          >{{ t('publicOrder.placeOrder') }} · {{ currency }}{{ cart.total.toFixed(2) }}</span
        >
      </Button>
    </div>
  </div>
</template>
