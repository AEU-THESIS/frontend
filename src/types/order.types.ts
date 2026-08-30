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
  categoryId: number // used to match category-scoped promotions
  productName: string
  imageUrl: string | null
  basePrice: number
  quantity: number
  selectedOptions: CartItemOption[]
  itemTotal: number // (basePrice + sum(extraPrices)) × qty
  // Complimentary line (loyalty-stamp redemption). When true the line is not charged:
  // it contributes 0 to the cart totals but its itemTotal is still shown struck through.
  isComplimentary?: boolean
  compReason?: string
}

export type PaymentCurrency = 'USD' | 'KHR'
export type OrderType = 'dine_in' | 'takeaway'

export interface CartItemPayload {
  productId: number
  quantity: number
  selectedOptions: CartItemOption[]
  // Marks the line free (loyalty-stamp redemption); the server persists it with
  // subtotal 0 and records compReason for the audit trail.
  isComplimentary?: boolean
  compReason?: string
}

export interface CreateOrderPayload {
  orderType: OrderType
  paymentMethod: 'cash'
  paymentCurrency: PaymentCurrency
  // Amount handed over, in the payment currency. The server owns the total and
  // the exchange rate, so they are no longer part of the request.
  receivedAmount: number
  items: CartItemPayload[]
}

export interface OrderResult {
  id: number
  orderNumber: string
  totalAmount: number | string
  receivedAmount: number | string
  // Received amount normalised to USD (for reporting).
  receivedAmountUsd: number | string
  paymentCurrency: PaymentCurrency
  // Change returned in the payment currency, computed and rounded by the server.
  changeAmount: number | string
  // Server-resolved shop exchange rate applied to this order.
  exchangeRateSnapshot: number | string
  paymentStatus: string
  fulfillmentStatus: string
}

// The receipt contract passed from the POS view to the success modal after a
// sale. Change is expressed in both currencies (derived from the server's figures).
export interface CheckoutSuccessData {
  orderId: number
  orderNumber: string
  totalAmount: number
  receivedAmount: number
  paymentCurrency: PaymentCurrency
  exchangeRateSnapshot: number
  changeUSD: number
  changeKHR: number
  // Complimentary (free) lines on this order, captured for the receipt's free-items
  // note. Empty/undefined for an ordinary order.
  freeItems?: { name: string; quantity: number }[]
  // The signed-in cashier who took the sale, printed on the receipt as "Served by".
  // Null/undefined falls back to "System" (see cashierName).
  servedBy?: string | null
}

// The staff member who took an order. Attached to every order response (list,
// detail and the live SSE update). Null on an order with no recorded user — an
// order placed before cashiers were tracked, or a customer pre-order — which the
// UI renders as "System" (see utils/cashier).
export interface OrderCashier {
  id: number
  name: string
  employeeId: string | null
}

// Lightweight promotion summary attached to an order for display in history.
export interface OrderPromotion {
  id: number
  name: string
  code: string | null
  discountType: string
  discountValue: number | string
}

// One row of an order's per-promotion discount breakdown (promotions stack).
export interface AppliedOrderPromotion {
  promotionId: number
  discountAmount: number | string
  promotion: {
    id: number
    name: string
    code: string | null
    discountType: string
  }
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
  // Complimentary line (loyalty-stamp redemption): stored with subtotal 0 and a
  // compReason for the audit trail; the receipt/history keep the struck price.
  isComplimentary: boolean
  compReason: string | null
  // Set when the line was cancelled (kept on the order, struck through in the UI).
  canceledAt: string | null
  canceledQuantity: number
  product: {
    id: number
    name: string
    imageUrl: string | null
    price: number | string
  }
  options: OrderItemOptionDetail[]
}

// A payment/refund record on an order. Refunds carry a negative amount.
export interface OrderTransaction {
  id: number
  amount: number | string
  currency: string
  paymentMethod: string
  status: string
  verifiedAt: string | null
  userId: number | null
}

export interface OrderDetail extends OrderResult {
  createdAt: string
  updatedAt: string
  userId: number | null
  // The cashier who took the order (null for an order with no recorded user).
  user?: OrderCashier | null
  tableSessionId: number | null
  promotionId: number | null
  // Amount the applied promotion took off. totalAmount is the net (post-discount)
  // charged; the pre-discount subtotal is totalAmount + discountAmount.
  discountAmount: number | string
  promotion?: OrderPromotion | null
  appliedPromotions?: AppliedOrderPromotion[]
  orderType: OrderType | 'pre_order'
  customerName: string | null
  customerPhone: string | null
  deliveryAddress: string | null
  // Customer pre-order (Telegram Mini App) fields — null for staff POS orders.
  deliveryLat?: number | string | null
  deliveryLng?: number | string | null
  telegramUserId?: string | null
  telegramUsername?: string | null
  paymentMethod: string
  khqrString: string | null
  // Void audit — set once a whole order is voided (refunded + canceled).
  voidedAt?: string | null
  voidReason?: string | null
  voidedByUserId?: number | null
  voidedBy?: { id: number; name: string } | null
  // Payment/refund records (refunds have a negative amount).
  transactions?: OrderTransaction[]
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
  // Per-order snapshot needed to display the exact riel figure the customer paid,
  // independent of the shop's current rate.
  exchangeRateSnapshot: string | number
  changeAmount: string | number
  paymentCurrency: 'USD' | 'KHR'
  createdAt: string
  // The cashier who took the order (null for an order with no recorded user).
  user?: OrderCashier | null
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
  date?: string // YYYY-MM-DD — start of the window
  /** Inclusive end of the window. Defaults to `date`, i.e. a single day. */
  endDate?: string // YYYY-MM-DD
  paymentMethod?: 'cash' | 'khqr'
}

export type PaymentMethodFilter = 'all' | 'cash' | 'khqr'
