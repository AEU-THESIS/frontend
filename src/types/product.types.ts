export interface Category {
  id: number
  name: string
  sortOrder?: number
}

export interface OptionSetElement {
  id: number
  optionSetId: number
  label: string
  priceModifier: number | string
  position?: number
}

export interface OptionSet {
  id: number
  name: string
  elements: OptionSetElement[]
}

export interface ProductOptionSet {
  id: number
  productId: number
  optionSetId: number
  isRequired: boolean
  optionSet: OptionSet
}

export interface Product {
  id: number
  categoryId: number
  name: string
  price: number | string
  imageUrl: string | null
  isAvailable: boolean
  category: Category
  optionSets: ProductOptionSet[]
}
