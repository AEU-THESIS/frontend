<script setup lang="ts">
import { ref, watch } from 'vue'
import { Camera, X, LoaderCircle } from 'lucide-vue-next'
import { getImageUrl } from '@/utils/image'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface Props {
  modelValue?: string | null
  label?: string
  recommendation?: string
  error?: string
  isUploading?: boolean
  disabled?: boolean
  accept?: string
  maxSizeMb?: number
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  label: undefined,
  recommendation: undefined,
  accept: 'image/*',
  maxSizeMb: 2,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
  (e: 'change', file: File): void
  (e: 'error', message: string): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const previewUrl = ref<string | null>(props.modelValue)

watch(
  () => props.modelValue,
  newVal => {
    previewUrl.value = newVal
  }
)

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  // Validation
  if (props.maxSizeMb && file.size > props.maxSizeMb * 1024 * 1024) {
    emit('error', t('imageUpload.errorTooLarge', { max: props.maxSizeMb }))
    return
  }

  // Local preview
  const reader = new FileReader()
  reader.onload = e => {
    previewUrl.value = e.target?.result as string
  }
  reader.readAsDataURL(file)

  emit('change', file)
}

const triggerUpload = () => {
  if (!props.disabled && !props.isUploading) {
    fileInput.value?.click()
  }
}

const removeImage = (e: Event) => {
  e.stopPropagation()
  previewUrl.value = null
  emit('update:modelValue', null)
  if (fileInput.value) fileInput.value.value = ''
}
</script>

<template>
  <div class="space-y-2.5">
    <div
      class="relative border-2 border-dashed border-[#DDC1B3] rounded-2xl p-6 bg-[#FAFAFA]/50 hover:bg-[#FAFAFA] transition-all group cursor-pointer flex items-center gap-8 min-h-[140px]"
      :class="{
        'opacity-60 cursor-not-allowed': disabled || isUploading,
        'border-rose-500 bg-rose-50/30': error,
      }"
      @click="triggerUpload"
    >
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        :accept="accept"
        :disabled="disabled || isUploading"
        @change="handleFileChange"
      />

      <!-- Preview/Placeholder Slot -->
      <div
        class="relative size-24 shrink-0 overflow-hidden rounded-xl border border-[#DDC1B3] bg-white flex flex-col items-center justify-center gap-1.5 shadow-sm group-hover:border-[#974400] transition-colors"
      >
        <template v-if="previewUrl">
          <img :src="getImageUrl(previewUrl)" class="h-full w-full object-cover" />
          <div
            class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            <Camera class="size-6 text-white" />
          </div>
        </template>
        <template v-else>
          <Camera class="size-6 text-[#A3A3A3] group-hover:text-[#974400] transition-colors" />
          <span
            class="text-[9px] font-black text-[#A3A3A3] uppercase tracking-widest group-hover:text-[#974400]"
          >
            {{ t('imageUpload.upload') }}
          </span>
        </template>

        <!-- Loading State -->
        <div
          v-if="isUploading"
          class="absolute inset-0 bg-white/80 flex items-center justify-center"
        >
          <LoaderCircle class="size-6 text-[#974400] animate-spin" />
        </div>
      </div>

      <!-- Text Info -->
      <div class="space-y-1 flex-1">
        <p class="text-sm font-bold text-[#1A1C1C]">
          {{ label || t('imageUpload.label') }}
        </p>
        <p class="text-[11px] text-[#737373] leading-relaxed max-w-[320px] font-medium">
          {{ recommendation || t('imageUpload.recommendation') }}
        </p>

        <!-- Error Message -->
        <p v-if="error" class="text-[11px] font-bold text-rose-500 mt-1">
          {{ error }}
        </p>
      </div>

      <!-- Action Button if image exists -->
      <Button
        v-if="previewUrl && !disabled && !isUploading"
        type="button"
        variant="outline"
        size="icon-sm"
        class="absolute top-4 right-4 rounded-full shadow-md border-[#EEEEEE] text-[#737373] hover:text-rose-500 transition-colors z-10"
        aria-label="Remove image"
        @click="removeImage"
      >
        <X class="size-4" />
      </Button>
    </div>
  </div>
</template>
