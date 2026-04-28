<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ZodError } from 'zod'
import { toast } from 'vue-sonner'
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from 'lucide-vue-next'
import { APP_ROUTES } from '@/constants/appRoutes'
import { useAuthStore } from '@/store/useAuthStore'
import { loginSchema } from '@/validations/authValidation'
import type { LoginInput } from '@/validations/authValidation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

const { t } = useI18n()
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const payload = reactive<LoginInput>({
  email: '',
  password: '',
})

const errors = ref<Record<string, string>>({})
const isLoading = ref(false)
const isPasswordVisible = ref(false)

const getPostLoginRoute = () => {
  const redirect = route.query.redirect

  if (
    typeof redirect === 'string' &&
    redirect.startsWith('/') &&
    redirect !== APP_ROUTES.LOGIN.path
  ) {
    return redirect
  }

  return APP_ROUTES.HOME.path
}

onMounted(() => {
  if (authStore.isSessionTerminated) {
    toast.warning(t('auth.sessionExpired'))
    authStore.clearSessionTerminated()
  }
})

const handleLogin = async () => {
  errors.value = {}

  try {
    loginSchema.parse(payload)
  } catch (err) {
    if (err instanceof ZodError) {
      err.issues.forEach(e => {
        if (e.path[0]) errors.value[e.path[0].toString()] = e.message
      })
      return
    }
  }

  try {
    isLoading.value = true
    await authStore.loginAction(payload)

    toast.success(t('auth.loginSuccess'))
    router.push(getPostLoginRoute())
  } catch (err) {
    const error = err as Error & { response?: { data?: { message?: string } } }
    const message = error.response?.data?.message || error.message || t('auth.loginError')
    toast.error(message)
    errors.value.root = message
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <main
    class="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-10 text-foreground"
  >
    <div class="pointer-events-none fixed inset-0 overflow-hidden">
      <div class="absolute -left-24 -top-24 size-80 rounded-full bg-primary/5 blur-3xl" />
      <div
        class="absolute -bottom-24 -right-24 size-80 rounded-full bg-muted-foreground/10 blur-3xl"
      />
    </div>

    <Card class="relative z-10 w-full max-w-md gap-0 px-8 py-8 shadow-xl md:px-12 md:py-12">
      <CardContent class="p-0">
        <div class="flex flex-col items-center text-center">
          <div
            class="mb-6 flex size-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md"
          >
            <span class="material-symbols-outlined text-[28px]" aria-hidden="true"> coffee </span>
          </div>
          <h1 class="font-headline text-2xl font-extrabold leading-tight tracking-tight">
            {{ t('auth.title') }}
          </h1>
          <p class="mt-2 font-medium text-muted-foreground">
            {{ t('auth.subtitle') }}
          </p>
        </div>

        <form class="mt-8 space-y-5" @submit.prevent="handleLogin">
          <div class="space-y-1.5">
            <Label class="text-sm font-semibold text-muted-foreground" for="email">
              {{ t('auth.email') }}
            </Label>
            <div class="group relative">
              <Mail
                class="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
                aria-hidden="true"
              />
              <Input
                id="email"
                v-model="payload.email"
                class="h-12 border-transparent bg-muted pl-12 shadow-none focus-visible:border-border focus-visible:ring-0 dark:bg-input/30"
                type="email"
                :class="{
                  'border-destructive focus-visible:border-destructive': errors.email,
                }"
                :disabled="isLoading"
                :placeholder="t('auth.emailPlaceholder')"
              />
            </div>
            <p v-if="errors.email" class="text-sm font-medium text-destructive">
              {{ errors.email }}
            </p>
          </div>

          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <Label class="text-sm font-semibold text-muted-foreground" for="password">
                {{ t('auth.password') }}
              </Label>
              <a
                class="text-xs font-bold text-primary transition-opacity hover:opacity-80"
                href="#"
              >
                {{ t('auth.forgotPassword') }}
              </a>
            </div>
            <div class="group relative">
              <LockKeyhole
                class="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
                aria-hidden="true"
              />
              <Input
                id="password"
                v-model="payload.password"
                class="h-12 border-transparent bg-muted pl-12 pr-12 shadow-none focus-visible:border-border focus-visible:ring-0 dark:bg-input/30"
                :type="isPasswordVisible ? 'text' : 'password'"
                :class="{
                  'border-destructive focus-visible:border-destructive': errors.password,
                }"
                :disabled="isLoading"
                :placeholder="t('auth.passwordPlaceholder')"
              />
              <Button
                class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:bg-transparent hover:text-foreground"
                size="icon-sm"
                type="button"
                variant="ghost"
                :aria-label="isPasswordVisible ? t('auth.hidePassword') : t('auth.showPassword')"
                :disabled="isLoading"
                @click="isPasswordVisible = !isPasswordVisible"
              >
                <EyeOff v-if="isPasswordVisible" class="size-4" aria-hidden="true" />
                <Eye v-else class="size-4" aria-hidden="true" />
              </Button>
            </div>
            <p v-if="errors.password" class="text-sm font-medium text-destructive">
              {{ errors.password }}
            </p>
          </div>

          <div
            v-if="errors.root"
            class="rounded-md border border-destructive/30 bg-destructive/10 p-3"
          >
            <p class="text-center text-sm font-medium text-destructive">
              {{ errors.root }}
            </p>
          </div>

          <Button
            class="mt-3 h-12 w-full bg-foreground font-bold text-background shadow-md hover:bg-foreground/90 active:scale-95"
            type="submit"
            :disabled="isLoading"
          >
            <LoaderCircle v-if="isLoading" class="size-4 animate-spin" aria-hidden="true" />
            {{ isLoading ? t('auth.authenticating') : t('auth.signIn') }}
          </Button>
        </form>

        <footer
          class="mt-8 text-center text-xs uppercase leading-relaxed tracking-wider text-muted-foreground"
        >
          <p>{{ t('auth.authorizedOnly') }}</p>
          <p class="normal-case tracking-normal opacity-80">{{ t('auth.copyright') }}</p>
        </footer>
      </CardContent>
    </Card>
  </main>
</template>
