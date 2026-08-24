import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './store'
import i18n from './i18n'
import './assets/css/style.css'
import 'vue-sonner/style.css'
import { registerGlobalComponents } from './plugins/globalComponents'

// Disable pinch-to-zoom on iOS Safari & Telegram Mini App (matching Telegram Wallet native feel)
if (typeof window !== 'undefined') {
  // Prevent Safari gesture zoom
  document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false })
  document.addEventListener('gesturechange', e => e.preventDefault(), { passive: false })
  document.addEventListener('gestureend', e => e.preventDefault(), { passive: false })

  // Prevent multi-touch pinch zoom
  document.addEventListener(
    'touchmove',
    e => {
      if (e.touches.length > 1) {
        e.preventDefault()
      }
    },
    { passive: false }
  )

  // Prevent double-tap zoom on iOS
  let lastTouchEnd = 0
  document.addEventListener(
    'touchend',
    e => {
      const now = Date.now()
      if (now - lastTouchEnd <= 300) {
        const target = e.target as HTMLElement | null
        if (target && !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
          e.preventDefault()
        }
      }
      lastTouchEnd = now
    },
    { passive: false }
  )
}

const app = createApp(App)
registerGlobalComponents(app)

app.use(pinia)
app.use(router)
app.use(i18n)
app.mount('#app')
