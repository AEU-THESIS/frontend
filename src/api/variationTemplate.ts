import http from './api'
import type { VariationTemplate, AppliedVariationTemplate } from '@/types/variationTemplate.types'
import type {
  CreateVariationTemplatePayload,
  UpdateVariationTemplatePayload,
} from '@/validations/variationTemplateValidation'

const mapTemplate = (template: VariationTemplate): VariationTemplate => ({
  ...template,
  options: (template.options || []).map(option => ({
    ...option,
    priceModifier: Number(option.priceModifier),
  })),
})

export const getVariationTemplates = async (
  filters: {
    search?: string
    includeArchived?: boolean
  } = {}
): Promise<VariationTemplate[]> => {
  const res = await http.get<VariationTemplate[]>('/api/variation-templates', { params: filters })
  return res.data.map(mapTemplate)
}

export const createVariationTemplate = async (
  payload: CreateVariationTemplatePayload
): Promise<VariationTemplate> => {
  const res = await http.post<VariationTemplate>('/api/variation-templates', payload)
  return mapTemplate(res.data)
}

export const updateVariationTemplate = async (
  templateId: number,
  payload: UpdateVariationTemplatePayload
): Promise<VariationTemplate> => {
  const res = await http.put<VariationTemplate>(`/api/variation-templates/${templateId}`, payload)
  return mapTemplate(res.data)
}

export const deleteVariationTemplate = async (
  templateId: number,
  options: { archive?: boolean } = {}
): Promise<{ id: number }> => {
  const res = await http.delete<{ id: number }>(`/api/variation-templates/${templateId}`, {
    params: options.archive ? { archive: 'true' } : undefined,
  })
  return res.data
}

export const applyVariationTemplate = async (
  templateId: number
): Promise<AppliedVariationTemplate> => {
  const res = await http.post<AppliedVariationTemplate>(
    `/api/variation-templates/${templateId}/applications`
  )
  return res.data
}
