<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ZodError } from 'zod'
import { toast } from 'vue-sonner'
import { ArrowLeft, Mail, LoaderCircle } from 'lucide-vue-next'
import { APP_ROUTES } from '@/constants/appRoutes'
import { forgotPassword } from '@/api/auth'
import { forgotPasswordSchema } from '@/validations/resetPasswordValidation'
import type { ApiError } from '@/types/api.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

const { t } = useI18n()
const router = useRouter()

const email = ref('')
const errors = ref<Record<string, string>>({})
const isLoading = ref(false)
const isSent = ref(false)

const handleSubmit = async () => {
  errors.value = {}

  try {
    forgotPasswordSchema.parse({ email: email.value })
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
    await forgotPassword({ email: email.value })
    isSent.value = true
    toast.success(t('forgotPassword.successMessage'))
  } catch (err) {
    const error = err as ApiError
    const message =
      error.response?.data?.message || error.message || t('forgotPassword.errorMessage')
    toast.error(message)
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
        class="absolute -bottom-[10%] -right-[10%] size-[500px] rounded-full bg-amber-500/5 blur-[120px] animate-pulse animate-[animation-delay:2s]"
      />
    </div>

    <Card
      class="relative z-10 w-full max-w-[440px] border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-[32px] bg-white/80 backdrop-blur-xl p-2"
    >
      <CardContent class="p-10 md:p-12">
        <div class="flex flex-col items-center text-center">
          <div
            class="mb-8 flex size-20 items-center justify-center rounded-[28px] bg-primary shadow-2xl shadow-primary/30"
          >
            <Mail class="size-8 text-white" aria-hidden="true" />
          </div>
          <h1 class="text-3xl font-black tracking-tight text-slate-900 mb-2">
            {{ t('forgotPassword.title') }}
          </h1>
          <p class="text-[15px] font-semibold text-slate-400">
            {{ t('forgotPassword.subtitle') }}
          </p>
        </div>

        <!-- Success State -->
        <div
          v-if="isSent"
          class="mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          <div class="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6 text-center">
            <p class="text-sm font-bold text-emerald-600 leading-relaxed">
              {{ t('forgotPassword.sentConfirmation') }}
            </p>
          </div>
          <Button
            class="h-14 w-full rounded-2xl bg-slate-900 font-bold text-white shadow-xl shadow-slate-900/10 hover:bg-slate-800 hover:-translate-y-0.5 transition-all duration-300"
            @click="router.push({ name: APP_ROUTES.LOGIN.name })"
          >
            <ArrowLeft class="size-5 mr-3" aria-hidden="true" />
            {{ t('forgotPassword.backToLogin') }}
          </Button>
        </div>

        <!-- Form State -->
        <form v-else class="mt-12 space-y-6" @submit.prevent="handleSubmit">
          <div class="space-y-2">
            <Label
              class="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1"
              for="reset-email"
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
                id="reset-email"
                v-model="email"
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

          <Button
            class="mt-4 h-14 w-full rounded-2xl bg-slate-900 font-bold text-white shadow-xl shadow-slate-900/10 hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
            type="submit"
            :disabled="isLoading"
          >
            <LoaderCircle v-if="isLoading" class="size-5 animate-spin mr-3" aria-hidden="true" />
            {{ isLoading ? t('common.loading') : t('forgotPassword.submit') }}
          </Button>
        </form>

        <div v-if="!isSent" class="mt-8 text-center">
          <router-link
            :to="{ name: APP_ROUTES.LOGIN.name }"
            class="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
          >
            <ArrowLeft class="size-4" aria-hidden="true" />
            {{ t('forgotPassword.backToLogin') }}
          </router-link>
        </div>
      </CardContent>
    </Card>
  </main>
</template>
