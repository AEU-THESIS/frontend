export interface User {
  user_id?: number
  id?: number
  name?: string
  email?: string
  shop_id?: number
  role: string | null
  image_url?: string | null
  imageUrl?: string | null
}

export interface AuthResponse {
  token: string
  user: User
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}
