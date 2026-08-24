import type { App } from 'vue'
import { Button } from '@/components/ui/button'
import { AppInput } from '@/components/ui/input'

/**
 * Registers global components to the Vue App instance.
 * Add any new globally required components here.
 */
export function registerGlobalComponents(app: App) {
  app.component('Button', Button)
  app.component('AppInput', AppInput)
}
