<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { APP_ROUTES } from '@/constants/appRoutes'
import { useAuthStore } from '@/store/useAuthStore'
import { loginSchema } from '@/validations/authValidation'
import type { LoginInput } from '@/validations/authValidation'
import { ZodError } from 'zod'
import { toast } from 'vue-sonner'

// shadcn-vue elements
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const authStore = useAuthStore()
const router = useRouter()

const payload = reactive<LoginInput>({
  email: '',
  password: '',
})

const errors = ref<Record<string, string>>({})
const isLoading = ref(false)

const handleLogin = async () => {
  // Clear previous state
  errors.value = {}

  // Zod Frontend Validation
  try {
    loginSchema.parse(payload)
  } catch (err) {
    if (err instanceof ZodError) {
      err.issues.forEach(e => {
        if (e.path[0]) errors.value[e.path[0].toString()] = e.message
      })
      return // Early return stringently protecting backend
    }
  }

  // API Call Execution
  try {
    isLoading.value = true
    await authStore.loginAction(payload)

    toast.success(t('auth.loginSuccess'))
    router.push({ name: APP_ROUTES.HOME.name })
  } catch (err) {
    const error = err as Error & { response?: { data?: { message?: string } } }
    // Graceful error mapping automatically pushed from interceptors
    const message = error.response?.data?.message || error.message || t('auth.loginError')
    toast.error(message)
    errors.value.root = message
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center p-4">
    <Card class="w-full max-w-md shadow-lg rounded-2xl">
      <CardHeader class="space-y-1 text-center">
        <CardTitle class="text-3xl font-bold tracking-tight">{{ t('auth.title') }}</CardTitle>
        <CardDescription class="text-neutral-500">
          {{ t('auth.subtitle') }}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form class="space-y-4" @submit.prevent="handleLogin">
          <!-- Email Field -->
          <div class="space-y-2">
            <Label for="email">{{ t('auth.email') }}</Label>
            <Input
              id="email"
              v-model="payload.email"
              type="email"
              :placeholder="t('auth.adminEmailPlaceholder')"
              :class="{
                'border-red-500 focus-visible:ring-red-500': errors.email,
              }"
              :disabled="isLoading"
            />
            <p v-if="errors.email" class="text-sm text-red-500 font-medium">
              {{ errors.email }}
            </p>
          </div>

          <!-- Password Field -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <Label for="password">{{ t('auth.password') }}</Label>
              <a href="#" class="text-sm font-medium text-blue-600 hover:text-blue-500">
                {{ t('auth.forgotPassword') }}
              </a>
            </div>
            <Input
              id="password"
              v-model="payload.password"
              type="password"
              :class="{
                'border-red-500 focus-visible:ring-red-500': errors.password,
              }"
              :disabled="isLoading"
            />
            <p v-if="errors.password" class="text-sm text-red-500 font-medium">
              {{ errors.password }}
            </p>
          </div>

          <!-- Root Error (Incorrect Password) -->
          <div v-if="errors.root" class="p-3 rounded bg-red-50 border border-red-200">
            <p class="text-sm text-red-600 text-center font-medium">
              {{ errors.root }}
            </p>
          </div>

          <!-- Submit Button -->
          <Button
            type="submit"
            class="w-full py-6 mt-4 text-base font-semibold"
            :disabled="isLoading"
          >
            <svg
              v-if="isLoading"
              class="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            {{ isLoading ? t('auth.authenticating') : t('auth.signIn') }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
