export interface VariationTemplateOption {
  id: number
  templateId: number
  optionLabel: string
  priceModifier: number
  displayOrder: number
  createdAt?: string
  updatedAt?: string
}

export interface VariationTemplate {
  id: number
  name: string
  description: string | null
  category: string
  createdBy: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  optionCount: number
  options: VariationTemplateOption[]
}

export interface AppliedVariationTemplate {
  name: string
  type: 'custom'
  choices: Array<{
    label: string
    priceModifier: number
  }>
}
