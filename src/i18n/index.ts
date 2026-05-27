import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import kh from './locales/kh.json'

const savedLocale = localStorage.getItem('app-locale') || 'en'

const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'en',
  messages: {
    en,
    kh,
  },
})

export default i18n
