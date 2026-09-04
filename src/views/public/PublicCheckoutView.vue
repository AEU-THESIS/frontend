<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { usePublicShopStore } from '@/store/usePublicShopStore'
import { usePublicCartStore, type PublicCartItem } from '@/store/usePublicCartStore'
import { createPreOrder, getMyProfile } from '@/api/publicOrder'
import { APP_ROUTES } from '@/constants/appRoutes'
import { useTelegram } from '@/composables/useTelegram'
import { getImageUrl } from '@/utils/image'
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

// Remember the guest's contact details so repeat orders are faster. localStorage
// gives an instant fill on the same device; the server profile (keyed by Telegram
// id) also covers a fresh device.
const NAME_KEY = 'public-customer-name'
const PHONE_KEY = 'public-customer-phone'

onMounted(async () => {
  // 1. Instant fill from this device's last order.
  try {
    name.value = localStorage.getItem(NAME_KEY) || ''
    phone.value = localStorage.getItem(PHONE_KEY) || ''
  } catch {
    // localStorage may be unavailable (private mode) — ignore.
  }
  // 2. Server-remembered profile — only fill fields the guest hasn't already typed,
  // so we never clobber in-progress input.
  try {
    const profile = await getMyProfile()
    if (!name.value && profile.name) name.value = profile.name
    if (!phone.value && profile.phone) phone.value = profile.phone
  } catch {
    // Best-effort; checkout still works without a remembered profile.
  }
})

const currency = computed(() => shopStore.shop?.currencySymbol ?? '$')
const phoneValid = computed(() => /^[+]?[0-9][0-9\s-]{5,19}$/.test(phone.value.trim()))
const canSubmit = computed(() => cart.count > 0 && phoneValid.value && !submitting.value)
const mapsLink = computed(() =>
  lat.value != null && lng.value != null
    ? `https://maps.google.com/?q=${lat.value},${lng.value}`
    : null
)

const optionSummary = (opts: { optionName: string }[]) => opts.map(o => o.optionName).join(', ')

const freeQtyFor = (item: PublicCartItem) => cart.bogoFreeByCartId[item.cartId] ?? 0

const bogoHintFor = (item: PublicCartItem) => {
  const promo = shopStore.promotionForProduct(item.productId, item.categoryId)
  return promo?.discountType === 'BOGO' && freeQtyFor(item) === 0
}

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
    // Remember contact details on this device for the next order.
    try {
      localStorage.setItem(NAME_KEY, name.value.trim())
      localStorage.setItem(PHONE_KEY, phone.value.trim())
    } catch {
      // localStorage unavailable — the server still remembers the profile.
    }
    cart.clear()
    tg.notify('success')
    router.push({
      name: APP_ROUTES.PUBLIC_CONFIRMATION.name,
      params: { slug: shopStore.slug, orderNumber: result.orderNumber },
    })
  } catch (e: unknown) {
    const err = e as { response?: { status?: number; data?: { message?: string } } }
    tg.notify('error')
    // Blocked customer → mark blocked state
    if (err?.response?.status === 403) {
      shopStore.isBlocked = true
      return
    }
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
      <section class="space-y-2.5 px-4 pt-2">
        <div
          v-for="item in cart.items"
          :key="item.cartId"
          class="flex items-center gap-3.5 rounded-2xl border border-stone-100 bg-white p-3.5 shadow-sm dark:border-stone-800 dark:bg-stone-800"
        >
          <!-- Product image / fallback -->
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-stone-50 text-stone-300 dark:bg-stone-900 dark:text-stone-700"
          >
            <img
              v-if="item.imageUrl"
              class="h-full w-full object-cover"
              :alt="item.name"
              :src="getImageUrl(item.imageUrl)"
            />
            <span v-else class="material-symbols-outlined text-2xl">local_cafe</span>
          </div>

          <!-- Info -->
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-bold text-stone-800 dark:text-stone-100">
              {{ item.name }}
            </p>
            <p
              v-if="item.options.length"
              class="truncate text-[11px] font-medium text-stone-400 dark:text-stone-500"
            >
              {{ optionSummary(item.options) }}
            </p>
            <!-- BOGO free status -->
            <p
              v-if="freeQtyFor(item) > 0"
              class="mt-0.5 flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-600 dark:text-emerald-500"
            >
              <span class="material-symbols-outlined text-[13px] leading-none">redeem</span>
              {{ t('cart.bogoFree', { count: freeQtyFor(item) }) }}
            </p>
            <!-- BOGO hint -->
            <p
              v-else-if="bogoHintFor(item)"
              class="mt-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-500"
            >
              <span class="material-symbols-outlined text-[13px] leading-none">add_circle</span>
              {{ t('cart.bogoHint') }}
            </p>
          </div>

          <!-- Quantity Stepper -->
          <div class="flex items-center gap-1.5 rounded-xl bg-stone-100 p-1 dark:bg-stone-950">
            <button
              class="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-stone-700 active:scale-90 dark:bg-stone-800 dark:text-stone-100"
              @click="cart.updateQuantity(item.cartId, item.quantity - 1)"
            >
              <span class="material-symbols-outlined text-sm">remove</span>
            </button>
            <span class="w-5 text-center text-sm font-extrabold">{{ item.quantity }}</span>
            <button
              class="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-stone-700 active:scale-90 dark:bg-stone-800 dark:text-stone-100"
              @click="cart.updateQuantity(item.cartId, item.quantity + 1)"
            >
              <span class="material-symbols-outlined text-sm">add</span>
            </button>
          </div>

          <!-- Line total -->
          <div class="w-14 text-right shrink-0">
            <span class="text-sm font-extrabold text-stone-900 dark:text-stone-50">
              {{ currency }}{{ item.lineTotal.toFixed(2) }}
            </span>
          </div>
        </div>
      </section>

      <!-- Order summary / Discounts -->
      <section class="mt-3 px-4">
        <div
          class="space-y-2 rounded-2xl border border-stone-100 bg-white p-4 shadow-sm text-sm dark:border-stone-800 dark:bg-stone-800"
        >
          <div
            class="flex items-center justify-between font-bold text-stone-500 dark:text-stone-400"
          >
            <span>{{ t('cart.subtotal') }}</span>
            <span>{{ currency }}{{ cart.subtotal.toFixed(2) }}</span>
          </div>

          <!-- Discounts breakdown -->
          <div v-if="cart.discountTotal > 0" class="flex flex-col gap-1.5">
            <div
              class="flex items-center justify-between font-bold text-emerald-600 dark:text-emerald-500"
            >
              <span class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-base leading-none">sell</span>
                <span>{{ t('cart.discount') }}</span>
              </span>
              <span>-{{ currency }}{{ cart.discountTotal.toFixed(2) }}</span>
            </div>
            <!-- Per-promotion breakdown line items with promotion name -->
            <div
              v-for="applied in cart.appliedPromotions"
              :key="applied.promotion.id"
              class="flex items-center justify-between pl-5 text-xs text-stone-400 dark:text-stone-500"
            >
              <span class="truncate max-w-[200px]">· {{ applied.promotion.name }}</span>
              <span>-{{ currency }}{{ applied.discount.toFixed(2) }}</span>
            </div>
          </div>

          <div
            class="flex items-center justify-between border-t border-stone-100 pt-2 text-base font-extrabold text-stone-900 dark:border-stone-700 dark:text-stone-50"
          >
            <span>{{ t('publicOrder.total') }}</span>
            <span class="text-primary">{{ currency }}{{ cart.total.toFixed(2) }}</span>
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
      class="tg-safe-bottom fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md md:max-w-xl lg:max-w-2xl border-t border-stone-100 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-900"
    >
      <Button
        class="h-12 w-full rounded-2xl font-bold shadow-sm transition active:scale-[0.98]"
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
