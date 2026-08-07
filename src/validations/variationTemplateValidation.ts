import { z } from 'zod'

export const VARIATION_TEMPLATE_CATEGORIES = [
  'Coffee',
  'Drink',
  'Food',
  'Dessert',
  'Other',
] as const

const templateValidation = 'menuManagement.productForm.templateEditor.validation'

const variationTemplateOptionPayloadSchema = z.object({
  optionLabel: z.string().trim().min(1, `${templateValidation}.optionLabelRequired`).max(255),
  priceModifier: z.number().min(0).default(0),
  displayOrder: z.number().int().min(0).default(0),
})

export const createVariationTemplatePayloadSchema = z.object({
  name: z.string().trim().min(1, `${templateValidation}.nameRequired`).max(255),
  description: z.string().trim().max(1000).optional().nullable(),
  category: z.enum(VARIATION_TEMPLATE_CATEGORIES).optional(),
  options: z
    .array(variationTemplateOptionPayloadSchema)
    .min(1, `${templateValidation}.optionsRequired`),
})

export type CreateVariationTemplatePayload = z.infer<typeof createVariationTemplatePayloadSchema>

export const updateVariationTemplatePayloadSchema = createVariationTemplatePayloadSchema
  .partial()
  .extend({ isActive: z.boolean().optional() })

export type UpdateVariationTemplatePayload = z.infer<typeof updateVariationTemplatePayloadSchema>
