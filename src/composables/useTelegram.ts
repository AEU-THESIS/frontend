/**
 * Thin wrapper over the Telegram Mini App runtime (`window.Telegram.WebApp`,
 * injected by telegram-web-app.js — see index.html). Outside Telegram (e.g. local
 * dev in a normal browser) `WebApp` is absent; the app still works and the public
 * axios instance falls back to a dev identity header (see publicHttp.ts).
 *
 * Also exposes haptic helpers — no-ops off-device, a real tap on a phone.
 */

interface TelegramWebAppUser {
  id: number
  username?: string
  first_name?: string
  last_name?: string
}

interface TelegramHaptic {
  impactOccurred?: (style: 'light' | 'medium' | 'heavy' | 'soft' | 'rigid') => void
  notificationOccurred?: (type: 'error' | 'success' | 'warning') => void
  selectionChanged?: () => void
}

interface TelegramWebApp {
  initData: string
  initDataUnsafe?: { user?: TelegramWebAppUser }
  ready: () => void
  expand: () => void
  colorScheme?: 'light' | 'dark'
  themeParams?: Record<string, string>
  HapticFeedback?: TelegramHaptic
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}

export function useTelegram() {
  const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined
  const isTelegram = !!webApp && !!webApp.initData

  if (webApp) {
    try {
      webApp.ready()
      webApp.expand()
    } catch {
      // no-op — older clients may not support every method
    }
  }

  const u = webApp?.initDataUnsafe?.user
  const user = u ? { id: String(u.id), username: u.username, firstName: u.first_name } : null

  /** A physical tap on a real device; silently ignored in a normal browser. */
  const haptic = (style: 'light' | 'medium' | 'heavy' | 'soft' | 'rigid' = 'light') => {
    try {
      webApp?.HapticFeedback?.impactOccurred?.(style)
    } catch {
      /* ignore */
    }
  }

  /** Success/error/warning buzz for a completed (or failed) action. */
  const notify = (type: 'success' | 'error' | 'warning' = 'success') => {
    try {
      webApp?.HapticFeedback?.notificationOccurred?.(type)
    } catch {
      /* ignore */
    }
  }

  return { webApp, isTelegram, user, haptic, notify }
}
