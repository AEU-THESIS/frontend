// Cart & Order types for the POS checkout flow
export interface CartItemOption {
  optionSetId: number
  elementId: number
  groupName: string
  optionName: string
  extraPrice: number
}

export interface CartItem {
  cartId: string // UUID — unique per cart entry
  productId: number
  productName: string
  imageUrl: string | null
  basePrice: number
  quantity: number
  selectedOptions: CartItemOption[]
  itemTotal: number // (basePrice + sum(extraPrices)) × qty
}

export type PaymentCurrency = 'USD' | 'KHR'
export type OrderType = 'dine_in' | 'takeaway'

export interface CartItemPayload {
  productId: number
  quantity: number
  selectedOptions: CartItemOption[]
}

export interface CreateOrderPayload {
  orderType: OrderType
  paymentMethod: 'cash'
  paymentCurrency: PaymentCurrency
  receivedAmount: number
  exchangeRateSnapshot: number
  totalAmount: number
  items: CartItemPayload[]
}

export interface OrderResult {
  id: number
  orderNumber: string
  totalAmount: number
  receivedAmount: number
  paymentCurrency: PaymentCurrency
  changeAmount: number
  exchangeRateSnapshot: number
  paymentStatus: string
  fulfillmentStatus: string
}
