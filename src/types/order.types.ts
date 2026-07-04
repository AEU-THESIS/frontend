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
  totalAmount: number | string
  receivedAmount: number | string
  paymentCurrency: PaymentCurrency
  changeAmount: number | string
  exchangeRateSnapshot: number | string
  paymentStatus: string
  fulfillmentStatus: string
}

export interface OrderItemOptionDetail {
  id: number
  orderItemId: number
  groupName: string
  optionName: string
  extraPrice: number | string
}

export interface OrderItemDetail {
  id: number
  orderId: number
  productId: number
  quantity: number
  price: number | string
  extraPrice: number | string
  subtotal: number | string
  product: {
    id: number
    name: string
    imageUrl: string | null
    price: number | string
  }
  options: OrderItemOptionDetail[]
}

export interface OrderDetail extends OrderResult {
  createdAt: string
  updatedAt: string
  userId: number | null
  tableSessionId: number | null
  promotionId: number | null
  orderType: OrderType
  customerName: string | null
  customerPhone: string | null
  deliveryAddress: string | null
  paymentMethod: string
  khqrString: string | null
  items: OrderItemDetail[]
}

export interface PaginatedOrders {
  orders: OrderDetail[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface OrderRow {
  id: number
  orderNumber: string
  orderType: 'dine_in' | 'takeaway'
  paymentStatus: string
  paymentMethod: 'cash' | 'khqr'
  totalAmount: string | number
  paymentCurrency: 'USD' | 'KHR'
  createdAt: string
}

export interface OrdersResponse {
  orders: OrderRow[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
export interface DailySummary {
  total_revenue: number
  cash_total: number
  khqr_total: number
  exchange_rate: number
}
export interface TodayOrdersFilters {
  date?: string // YYYY-MM-DD
  paymentMethod?: 'cash' | 'khqr'
}
