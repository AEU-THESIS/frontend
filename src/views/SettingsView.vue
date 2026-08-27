<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { AppInput } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getShopSettings, updateShopSettings } from '@/api/shop'
import { useShopSettingsStore } from '@/store/useShopSettingsStore'
import { USD_SYMBOL, KHR_SYMBOL, LEGACY_KHR_CODE } from '@/constants/currency'
import type { ShopSettings } from '@/types/shop'
import { getErrorMessage } from '@/utils/error'

const shopSettingsStore = useShopSettingsStore()
const { t } = useI18n()

const isLoading = ref(true)
const isSaving = ref(false)

const form = reactive({
  name: '',
  slug: '',
  ownerName: '',
  phone: '',
  address: '',
  bakongAccountId: '',
  currencySymbol: '',
  exchangeRate: '',
  receiptFooter: '',
  isOrderManagementEnabled: false,
  isShopClosed: false,
})

const receiptItems = [
  { nameKey: 'settings.receiptPreview.items.icedLatte', price: 3.5 },
  { nameKey: 'settings.receiptPreview.items.croissant', price: 2.25 },
]

const currencyOptions = computed(() => [
  { label: t('settings.currency.usd'), value: USD_SYMBOL },
  { label: t('settings.currency.khr'), value: KHR_SYMBOL },
])

const hasCustomCurrency = computed(
  () =>
    !!form.currencySymbol &&
    !currencyOptions.value.some(option => option.value === form.currencySymbol)
)

const receiptSubtotal = computed(() => receiptItems.reduce((total, item) => total + item.price, 0))

const receiptTotal = computed(() => {
  if (form.currencySymbol === KHR_SYMBOL) {
    return `${KHR_SYMBOL}${rielTotal.value}`
  }

  return `${form.currencySymbol || USD_SYMBOL}${receiptSubtotal.value.toFixed(2)}`
})

const getFormExchangeRate = () => Number(form.exchangeRate)

const getExchangeRateInputValue = (exchangeRate: ShopSettings['exchangeRate']) =>
  exchangeRate ? String(exchangeRate) : ''

const exchangeRateLabel = computed(() => {
  const value = getFormExchangeRate()
  return Number.isFinite(value) && value > 0 ? value.toLocaleString('en-US') : '0'
})

const rielTotal = computed(() => {
  const value = getFormExchangeRate()
  if (!Number.isFinite(value) || value <= 0) return '0'

  return Math.round(receiptSubtotal.value * value).toLocaleString('en-US')
})

const formatPreviewAmount = (amount: number) => {
  const value = getFormExchangeRate()

  if (form.currencySymbol === KHR_SYMBOL) {
    const convertedAmount = Number.isFinite(value) && value > 0 ? Math.round(amount * value) : 0
    return `${KHR_SYMBOL}${convertedAmount.toLocaleString('en-US')}`
  }

  return `${form.currencySymbol || USD_SYMBOL}${amount.toFixed(2)}`
}

const fillForm = (settings: ShopSettings) => {
  form.name = settings.name || ''
  form.slug = settings.slug || ''
  form.ownerName = settings.ownerName || ''
  form.phone = settings.phone || ''
  form.address = settings.address || ''
  form.bakongAccountId = settings.bakongAccountId || ''
  form.currencySymbol =
    settings.currencySymbol === LEGACY_KHR_CODE ? KHR_SYMBOL : settings.currencySymbol || ''
  form.exchangeRate = getExchangeRateInputValue(settings.exchangeRate)
  form.receiptFooter = settings.receiptFooter || ''
  form.isOrderManagementEnabled = settings.isOrderManagementEnabled === true
  form.isShopClosed = settings.isShopClosed === true
}

const loadSettings = async () => {
  isLoading.value = true

  try {
    const settings = await getShopSettings()
    fillForm(settings)
    shopSettingsStore.setShopSettings(settings)
  } catch (error) {
    toast.error(getErrorMessage(error, t('settings.messages.loadError')))
  } finally {
    isLoading.value = false
  }
}

const saveSettings = async () => {
  isSaving.value = true

  try {
    const settings = await updateShopSettings({
      name: form.name.trim(),
      owner_name: form.ownerName.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      bakong_account_id: form.bakongAccountId.trim() || null,
      currency_symbol: form.currencySymbol.trim() || USD_SYMBOL,
      exchange_rate: getFormExchangeRate(),
      receipt_footer: form.receiptFooter.trim() || null,
      is_order_management_enabled: form.isOrderManagementEnabled,
      is_shop_closed: form.isShopClosed,
    })

    fillForm(settings)
    shopSettingsStore.setShopSettings(settings)
    toast.success(t('settings.messages.saveSuccess'))
  } catch (error) {
    toast.error(getErrorMessage(error, t('settings.messages.saveError')))
  } finally {
    isSaving.value = false
  }
}

const previewReceipt = () => {
  toast.info(t('settings.actions.previewReceipt'))
}

const printReceipt = () => {
  window.print()
}

onMounted(loadSettings)
</script>

<template>
  <div class="h-full w-full overflow-y-auto bg-stone-50 dark:bg-stone-900">
    <form
      class="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6 lg:p-8"
      @submit.prevent="saveSettings"
    >
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            class="font-headline text-2xl font-extrabold tracking-normal text-stone-900 dark:text-stone-50"
          >
            {{ t('settings.title') }}
          </h1>
        </div>

        <Button
          type="submit"
          :disabled="isLoading || isSaving"
          class="h-10 rounded-lg bg-stone-900 px-5 text-sm font-bold text-white shadow-sm hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-950 dark:hover:bg-stone-200"
        >
          <span class="material-symbols-outlined text-[18px]">save</span>
          {{ isSaving ? t('settings.actions.saving') : t('settings.actions.saveChanges') }}
        </Button>
      </header>

      <div
        v-if="isLoading"
        class="flex min-h-[360px] items-center justify-center rounded-lg border border-stone-200 bg-white text-sm font-semibold text-stone-500 shadow-sm dark:border-stone-800 dark:bg-stone-950 dark:text-stone-400"
      >
        {{ t('settings.messages.loading') }}
      </div>

      <template v-else>
        <Card
          class="rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-950"
        >
          <div class="mb-5 flex items-start gap-3">
            <span
              class="material-symbols-outlined mt-0.5 text-[20px] text-amber-700 dark:text-amber-500"
            >
              storefront
            </span>
            <div>
              <h2 class="font-headline text-base font-extrabold text-stone-900 dark:text-stone-50">
                {{ t('settings.branch.title') }}
              </h2>
              <p class="text-xs font-medium text-stone-500 dark:text-stone-400">
                {{ t('settings.branch.description') }}
              </p>
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <Label
              class="flex flex-col items-start gap-2 text-xs font-bold text-stone-700 dark:text-stone-200"
            >
              {{ t('settings.fields.shopName') }}
              <AppInput
                v-model="form.name"
                class="h-11 rounded-lg border-stone-200 bg-stone-100 font-semibold text-stone-900 placeholder:text-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50"
              />
            </Label>

            <Label
              class="flex flex-col items-start gap-2 text-xs font-bold text-stone-700 dark:text-stone-200"
            >
              {{ t('settings.fields.branchSlug') }}
              <AppInput
                v-model="form.slug"
                disabled
                class="h-11 rounded-lg border-stone-200 bg-stone-100 font-semibold text-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400"
              />
            </Label>

            <Label
              class="flex flex-col items-start gap-2 text-xs font-bold text-stone-700 dark:text-stone-200"
            >
              {{ t('settings.fields.ownerName') }}
              <AppInput
                v-model="form.ownerName"
                class="h-11 rounded-lg border-stone-200 bg-stone-100 font-semibold text-stone-900 placeholder:text-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50"
              />
            </Label>

            <Label
              class="flex flex-col items-start gap-2 text-xs font-bold text-stone-700 dark:text-stone-200"
            >
              {{ t('settings.fields.phoneNumber') }}
              <AppInput
                v-model="form.phone"
                class="h-11 rounded-lg border-stone-200 bg-stone-100 font-semibold text-stone-900 placeholder:text-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50"
              />
            </Label>

            <Label
              class="flex flex-col items-start gap-2 text-xs font-bold text-stone-700 dark:text-stone-200 md:col-span-2"
            >
              {{ t('settings.fields.fullAddress') }}
              <AppInput
                v-model="form.address"
                class="h-11 rounded-lg border-stone-200 bg-stone-100 font-semibold text-stone-900 placeholder:text-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50"
              />
            </Label>

            <!-- Enable Order Management Switch -->
            <div
              class="md:col-span-2 border-t border-stone-100 dark:border-stone-800 pt-5 mt-2 flex items-center justify-between"
            >
              <div>
                <h3 class="text-sm font-bold text-stone-950 dark:text-stone-50">
                  {{ t('settings.orderManagement.title') }}
                </h3>
                <p class="text-xs font-medium text-stone-500 dark:text-stone-400 mt-0.5">
                  {{ t('settings.orderManagement.description') }}
                </p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer select-none">
                <input
                  v-model="form.isOrderManagementEnabled"
                  type="checkbox"
                  class="sr-only peer"
                />
                <div
                  class="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer dark:bg-stone-800 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-stone-600 peer-checked:bg-amber-700"
                ></div>
              </label>
            </div>

            <!-- Close Shop (Holiday / Temporary Closure) Switch -->
            <div
              class="md:col-span-2 border-t border-stone-100 dark:border-stone-800 pt-5 mt-2 flex items-center justify-between"
            >
              <div>
                <h3 class="text-sm font-bold text-stone-950 dark:text-stone-50">
                  {{ t('settings.shopClosure.title') }}
                </h3>
                <p class="text-xs font-medium text-stone-500 dark:text-stone-400 mt-0.5">
                  {{ t('settings.shopClosure.description') }}
                </p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer select-none">
                <input v-model="form.isShopClosed" type="checkbox" class="sr-only peer" />
                <div
                  class="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer dark:bg-stone-800 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-stone-600 peer-checked:bg-amber-700"
                ></div>
              </label>
            </div>
          </div>
        </Card>

        <section class="flex flex-col gap-4">
          <div class="flex items-start gap-3">
            <span
              class="material-symbols-outlined mt-0.5 text-[21px] text-amber-800 dark:text-amber-500"
            >
              payments
            </span>
            <div>
              <h2 class="font-headline text-xl font-extrabold text-stone-800 dark:text-stone-50">
                {{ t('settings.financials.title') }}
              </h2>
              <p class="text-sm font-medium text-stone-500 dark:text-stone-400">
                {{ t('settings.financials.description') }}
              </p>
            </div>
          </div>

          <Card
            class="rounded-lg border border-stone-100 bg-white p-7 shadow-sm dark:border-stone-800 dark:bg-stone-950"
          >
            <div class="grid gap-5 lg:grid-cols-[1.7fr_0.8fr_0.9fr]">
              <Label
                class="flex flex-col items-start gap-2 text-sm font-bold text-stone-700 dark:text-stone-200"
              >
                {{ t('settings.fields.bakongAccountId') }}
                <AppInput
                  v-model="form.bakongAccountId"
                  class="h-12 rounded-lg border-stone-200 bg-stone-100 px-4 text-base font-bold text-stone-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50"
                />
                <span class="text-[11px] font-extrabold uppercase tracking-wide text-stone-400">
                  {{ t('settings.financials.bakongHelper') }}
                </span>
              </Label>

              <Label
                class="flex flex-col items-start gap-2 text-sm font-bold text-stone-700 dark:text-stone-200"
              >
                {{ t('settings.fields.defaultCurrency') }}
                <Select v-model="form.currencySymbol">
                  <SelectTrigger
                    class="h-12 rounded-lg border-stone-200 bg-stone-100 px-4 text-base font-bold text-stone-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-if="hasCustomCurrency" :value="form.currencySymbol">
                      {{ form.currencySymbol }}
                    </SelectItem>
                    <SelectItem
                      v-for="option in currencyOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Label>

              <Label
                class="flex flex-col items-start gap-2 text-sm font-bold text-stone-700 dark:text-stone-200"
              >
                {{ t('settings.fields.exchangeRate') }}
                <div class="relative">
                  <AppInput
                    v-model="form.exchangeRate"
                    type="number"
                    min="0.01"
                    step="0.01"
                    class="h-12 rounded-lg border-stone-200 bg-stone-100 pr-14 text-right text-base font-bold text-stone-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50"
                  />
                  <span
                    class="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-extrabold text-stone-500 dark:text-stone-400"
                  >
                    {{ t('settings.currency.khrCode') }}
                  </span>
                </div>
              </Label>
            </div>
          </Card>
        </section>

        <section class="flex flex-col gap-4">
          <div class="flex items-start gap-3">
            <span
              class="material-symbols-outlined mt-0.5 text-[21px] text-amber-800 dark:text-amber-500"
            >
              receipt_long
            </span>
            <div>
              <h2 class="font-headline text-xl font-extrabold text-stone-800 dark:text-stone-50">
                {{ t('settings.receipt.title') }}
              </h2>
              <p class="text-sm font-medium text-stone-500 dark:text-stone-400">
                {{ t('settings.receipt.description') }}
              </p>
            </div>
          </div>

          <div class="grid gap-7 lg:grid-cols-[1.15fr_0.85fr]">
            <Card
              class="rounded-lg border border-stone-100 bg-white p-7 shadow-sm dark:border-stone-800 dark:bg-stone-950"
            >
              <Label
                class="flex flex-col items-start gap-3 text-sm font-bold text-stone-700 dark:text-stone-200"
              >
                {{ t('settings.fields.receiptFooterText') }}
                <Textarea
                  v-model="form.receiptFooter"
                  class="min-h-32 resize-y rounded-lg border border-stone-200 bg-stone-100 px-4 py-3 text-base font-bold leading-6 text-stone-800 outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50"
                />
              </Label>

              <div class="mt-7 border-t border-stone-100 pt-5 dark:border-stone-800">
                <div class="grid grid-cols-[1fr_auto] gap-4">
                  <Button
                    type="button"
                    variant="secondary"
                    class="h-14 rounded-lg bg-stone-100 text-base font-extrabold text-stone-700 hover:bg-stone-200 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
                    @click="previewReceipt"
                  >
                    <span class="material-symbols-outlined text-[22px]">visibility</span>
                    {{ t('settings.actions.previewReceipt') }}
                  </Button>
                  <Button
                    type="button"
                    class="h-14 w-14 rounded-lg bg-orange-100 text-stone-800 hover:bg-orange-200 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50"
                    @click="printReceipt"
                  >
                    <span class="material-symbols-outlined text-[23px]">print</span>
                  </Button>
                </div>
              </div>
            </Card>

            <Card
              class="rounded-lg border border-dashed border-stone-200 bg-white p-7 shadow-sm dark:border-stone-800 dark:bg-stone-950"
            >
              <div
                class="mx-auto flex min-h-[370px] w-full max-w-[330px] flex-col items-center justify-center rounded-lg bg-stone-50 p-6 dark:bg-stone-900"
              >
                <div class="w-full max-w-[240px] bg-white p-6 text-stone-900 shadow-md">
                  <div class="border-b border-dashed border-stone-300 pb-3 text-center">
                    <p class="font-headline text-sm font-extrabold uppercase">
                      {{ form.name || t('settings.receiptPreview.fallbackShopName') }}
                    </p>
                    <p v-if="form.address" class="mt-1 text-[10px] font-semibold text-stone-500">
                      {{ form.address }}
                    </p>
                  </div>

                  <div class="flex flex-col gap-2 py-4 text-xs">
                    <div
                      v-for="item in receiptItems"
                      :key="item.nameKey"
                      class="flex justify-between"
                    >
                      <span>{{ t(item.nameKey) }}</span>
                      <span class="font-bold">{{ formatPreviewAmount(item.price) }}</span>
                    </div>
                    <div class="mt-2 border-t border-stone-200 pt-2">
                      <div class="flex justify-between font-extrabold">
                        <span>{{ t('settings.receiptPreview.total') }}</span>
                        <span>{{ receiptTotal }}</span>
                      </div>
                      <div
                        class="mt-1 flex justify-between text-[10px] font-semibold text-stone-500"
                      >
                        <span>
                          {{ t('settings.receiptPreview.inRiel', { rate: exchangeRateLabel }) }}
                        </span>
                        <span>{{ rielTotal }} {{ t('settings.currency.khrCode') }}</span>
                      </div>
                    </div>
                  </div>

                  <p
                    v-if="form.receiptFooter"
                    class="border-t border-dashed border-stone-300 pt-3 text-center text-[10px] font-semibold leading-4 text-stone-500"
                  >
                    {{ form.receiptFooter }}
                  </p>

                  <div
                    class="mx-auto mt-5 flex h-10 w-10 items-center justify-center rounded-md bg-stone-200"
                  >
                    <span class="material-symbols-outlined text-[20px] text-stone-500"
                      >qr_code_2</span
                    >
                  </div>
                </div>

                <p class="mt-5 text-[11px] font-extrabold uppercase text-stone-400">
                  {{ t('settings.receiptPreview.mockupLabel') }}
                </p>
              </div>
            </Card>
          </div>
        </section>
      </template>
    </form>
  </div>
</template>
