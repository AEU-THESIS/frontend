export interface User {
  id: number
  name: string
  email: string
  shopId: number
  roles: string[]
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
