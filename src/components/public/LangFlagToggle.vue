<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * Flag language toggle for the customer Mini App. Shows the CURRENT language's
 * flag; tapping switches to the other language (en ⇄ kh) and persists the choice
 * to localStorage under the same key the staff app uses ('app-locale').
 */
const { locale, t } = useI18n()

const LANGS = [
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'kh', flag: '🇰🇭', label: 'ខ្មែរ' },
] as const

const current = computed(() => LANGS.find(l => l.code === locale.value) ?? LANGS[0])
const other = computed(() => (current.value.code === 'en' ? LANGS[1] : LANGS[0]))

const toggle = () => {
  const next = other.value.code
  locale.value = next
  localStorage.setItem('app-locale', next)
}
</script>

<template>
  <button
    type="button"
    class="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-xl leading-none transition active:scale-90 dark:bg-stone-800"
    :aria-label="t('publicOrder.switchLanguage', { lang: other.label })"
    :title="other.label"
    @click="toggle"
  >
    {{ current.flag }}
  </button>
</template>
