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
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import logoImg from '@/assets/shop-logo-bg.png'

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
    class="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F8FAFC] px-6 py-10 text-foreground"
  >
    <!-- Premium Background Orbs -->
    <div class="pointer-events-none fixed inset-0 overflow-hidden">
      <div
        class="absolute -left-[10%] -top-[10%] size-[500px] rounded-full bg-primary/5 blur-[120px] animate-pulse"
      />
      <div
        class="absolute -bottom-[10%] -right-[10%] size-[500px] rounded-full bg-amber-500/5 blur-[120px] animate-pulse"
        style="animation-delay: 2s"
      />
    </div>

    <Card
      class="relative z-10 w-full max-w-[440px] border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-[32px] bg-white/80 backdrop-blur-xl p-2"
    >
      <CardContent class="p-10 md:p-12">
        <div class="flex flex-col items-center text-center">
          <img
            :src="logoImg"
            class="mb-8 size-20 rounded-[28px] object-cover shadow-2xl hover:rotate-6 transition-transform duration-500"
            alt="Shop Logo"
          />
          <h1 class="text-3xl font-black tracking-tight text-slate-900 mb-2">
            {{ t('auth.title') }}
          </h1>
          <p class="text-[15px] font-semibold text-slate-400">
            {{ t('auth.subtitle') }}
          </p>
        </div>

        <form class="mt-12 space-y-6" @submit.prevent="handleLogin">
          <div class="space-y-2">
            <Label
              class="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1"
              for="email"
            >
              {{ t('auth.email') }}
            </Label>
            <div class="group relative">
              <div
                class="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors"
              >
                <Mail class="size-5" aria-hidden="true" />
              </div>
              <Input
                id="email"
                v-model="payload.email"
                class="h-14 rounded-2xl border-none bg-slate-100/50 pl-14 pr-6 text-[15px] font-bold shadow-none focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-primary/10 transition-all"
                type="email"
                :class="{ 'ring-2 ring-destructive/20 bg-destructive/5': errors.email }"
                :disabled="isLoading"
                :placeholder="t('auth.emailPlaceholder')"
              />
            </div>
            <p v-if="errors.email" class="text-xs font-bold text-destructive ml-1">
              {{ errors.email }}
            </p>
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between ml-1">
              <Label
                class="text-xs font-bold text-slate-400 uppercase tracking-wider"
                for="password"
              >
                {{ t('auth.password') }}
              </Label>
              <router-link
                :to="{ name: APP_ROUTES.FORGOT_PASSWORD.name }"
                class="text-xs font-bold text-primary hover:underline"
              >
                {{ t('auth.forgotPassword') }}
              </router-link>
            </div>
            <div class="group relative">
              <div
                class="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors"
              >
                <LockKeyhole class="size-5" aria-hidden="true" />
              </div>
              <Input
                id="password"
                v-model="payload.password"
                class="h-14 rounded-2xl border-none bg-slate-100/50 pl-14 pr-14 text-[15px] font-bold shadow-none focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-primary/10 transition-all"
                :type="isPasswordVisible ? 'text' : 'password'"
                :class="{ 'ring-2 ring-destructive/20 bg-destructive/5': errors.password }"
                :disabled="isLoading"
                :placeholder="t('auth.passwordPlaceholder')"
              />
              <Button
                class="absolute right-4 top-1/2 -translate-y-1/2 size-10 flex items-center justify-center text-slate-300 hover:text-slate-600 transition-colors"
                type="button"
                variant="ghost"
                size="icon"
                :aria-label="isPasswordVisible ? t('auth.hidePassword') : t('auth.showPassword')"
                :disabled="isLoading"
                @click="isPasswordVisible = !isPasswordVisible"
              >
                <EyeOff v-if="isPasswordVisible" class="size-5" aria-hidden="true" />
                <Eye v-else class="size-5" aria-hidden="true" />
              </Button>
            </div>
            <p v-if="errors.password" class="text-xs font-bold text-destructive ml-1">
              {{ errors.password }}
            </p>
          </div>

          <div
            v-if="errors.root"
            class="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 animate-in fade-in slide-in-from-top-1"
          >
            <p class="text-center text-xs font-bold text-destructive">
              {{ errors.root }}
            </p>
          </div>

          <Button
            class="mt-4 h-14 w-full rounded-2xl bg-slate-900 font-bold text-white shadow-xl shadow-slate-900/10 hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
            type="submit"
            :disabled="isLoading"
          >
            <LoaderCircle v-if="isLoading" class="size-5 animate-spin mr-3" aria-hidden="true" />
            {{ isLoading ? t('auth.authenticating') : t('auth.signIn') }}
          </Button>
        </form>

        <footer class="mt-12 text-center">
          <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 opacity-60">
            {{ t('auth.authorizedOnly') }}
          </p>
          <p class="text-xs font-semibold text-slate-300">{{ t('auth.copyright') }}</p>
        </footer>
      </CardContent>
    </Card>
  </main>
</template>
