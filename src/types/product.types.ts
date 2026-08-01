import { PRICE_MODE, TYPE, OPTIONS_SET_TYPE } from '@/constants/product'
export interface Category {
  id: number
  name: string
  sortOrder?: number
  isActive: boolean
  imageUrl?: string | null
  _count?: {
    products: number
  }
}

export interface OptionSetElement {
  id: number
  optionSetId: number
  label: string
  priceModifier: number
  position?: number
}

export interface OptionSet {
  id: number
  name: string
  elements: OptionSetElement[]
  type: string
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
  price: number | null
  imageUrl: string | null
  isAvailable: boolean
  category: Category
  priceMode?: string
  type?: string
  optionSets: ProductOptionSet[]
}

export interface ProductResponse {
  products: Product[]
  total: number
}
export interface PaginationParams {
  page: number
  pageSize: number
}
export interface ProductFilters {
  categoryId?: number
  name?: string
  isAvailable?: boolean
  paginationParams?: PaginationParams
}

export interface SizeRow {
  id: string
  size: string
  price: number | null
}
export interface Choice {
  id: string
  label: string
  priceModifier?: number | null
  price?: number | null
}
export interface OptionGroup {
  id: string
  name: string
  choices: Choice[]
  type?: typeof OPTIONS_SET_TYPE.SIZE | typeof OPTIONS_SET_TYPE.CUSTOM
}
// ── Types ──────────────────────────────────────────────────────────────────
export type PriceMode = typeof PRICE_MODE.FIXED | typeof PRICE_MODE.BY_SIZE
export type ItemType = typeof TYPE.FOOD | typeof TYPE.DRINK
export interface ItemForm {
  name: string
  category: number | string
  type: ItemType
  priceMode: PriceMode
  price: number | null
  sizes: SizeRow[]
  optionGroups: OptionGroup[]
  description: string
  // image: { src: string; name: string } | null
  imageUrl: string | null
}
export interface ProductTableItem {
  id: number
  sku: string
  name: string
  image: string
  category: string
  price: string | number
  isAvailable: boolean
}
