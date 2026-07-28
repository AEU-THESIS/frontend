import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getVariationTemplates,
  createVariationTemplate as createVariationTemplateApi,
  updateVariationTemplate as updateVariationTemplateApi,
  deleteVariationTemplate as deleteVariationTemplateApi,
} from '@/api/variationTemplate'
import type { VariationTemplate } from '@/types/variationTemplate.types'
import type {
  CreateVariationTemplatePayload,
  UpdateVariationTemplatePayload,
} from '@/validations/variationTemplateValidation'

export const useVariationTemplateStore = defineStore('variationTemplate', () => {
  const templates = ref<VariationTemplate[]>([])
  const isLoading = ref(false)
  const lastError = ref<string | null>(null)

  const fetchTemplates = async () => {
    isLoading.value = true
    lastError.value = null
    try {
      templates.value = await getVariationTemplates()
    } catch (err) {
      const error = err as Error
      lastError.value = error.message || 'Failed to fetch variation templates'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const createTemplate = async (
    payload: CreateVariationTemplatePayload
  ): Promise<VariationTemplate> => {
    lastError.value = null
    try {
      const created = await createVariationTemplateApi(payload)
      templates.value.unshift(created)
      return created
    } catch (err) {
      const error = err as Error
      lastError.value = error.message || 'Failed to create variation template'
      throw err
    }
  }

  const updateTemplate = async (
    templateId: number,
    payload: UpdateVariationTemplatePayload
  ): Promise<VariationTemplate> => {
    lastError.value = null
    try {
      const updated = await updateVariationTemplateApi(templateId, payload)
      const index = templates.value.findIndex(t => t.id === templateId)
      if (index !== -1) {
        templates.value[index] = updated
      }
      return updated
    } catch (err) {
      const error = err as Error
      lastError.value = error.message || 'Failed to update variation template'
      throw err
    }
  }

  const deleteTemplate = async (templateId: number): Promise<void> => {
    lastError.value = null
    try {
      await deleteVariationTemplateApi(templateId)
      templates.value = templates.value.filter(t => t.id !== templateId)
    } catch (err) {
      const error = err as Error
      lastError.value = error.message || 'Failed to delete variation template'
      throw err
    }
  }

  return {
    templates,
    isLoading,
    lastError,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  }
})
