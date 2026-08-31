import { defineStore } from 'pinia'
import { ref } from 'vue'
import { isAxiosError } from 'axios'
import { login, logout as logoutApi, getMe } from '@/api/auth'
import { UserSchema } from '@/validations/authValidation'
import type { LoginInput } from '@/validations/authValidation'
import type { User } from '@/types/auth.types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null)
  const isSessionTerminated = ref(false)

  const user = ref<User | null>(null)

  // Use localStorage to maintain session dynamically after page reloads
  const initializeFromStorage = () => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    if (storedToken) token.value = storedToken
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser)
        const validated = UserSchema.safeParse(parsed)
        if (validated.success) {
          user.value = validated.data
        } else {
          console.error('Invalid user data in localStorage', validated.error)
          localStorage.removeItem('user')
          user.value = null
        }
      } catch (e) {
        console.error('Failed to parse user from localStorage', e)
        localStorage.removeItem('user')
        user.value = null
      }
    }
  }
  initializeFromStorage()

  const isAuthenticated = () => !!token.value
  const getAccessToken = () => token.value

  const loginAction = async (credentials: LoginInput) => {
    const response = await login(credentials)
    token.value = response.token
    user.value = response.user
    localStorage.setItem('token', response.token)

    // Store only minimal non-PII fields
    const minimalUser = {
      user_id: response.user.user_id || response.user.id,
      shop_id: response.user.shop_id,
      role: response.user.role,
      name: response.user.name,
      imageUrl: response.user.image_url || response.user.imageUrl,
    }
    localStorage.setItem('user', JSON.stringify(minimalUser))
  }

  // Re-read the signed-in user from the server so a role change or deactivation
  // takes effect on the next page load without re-login. The browser copy is a
  // cache only — every API call is still authorized server-side (AT-74).
  const refreshUser = async () => {
    if (!token.value) return
    try {
      const fresh = await getMe()
      user.value = fresh
      const minimalUser = {
        user_id: fresh.user_id || fresh.id,
        shop_id: fresh.shop_id,
        role: fresh.role,
        name: fresh.name,
        imageUrl: fresh.image_url || fresh.imageUrl,
      }
      localStorage.setItem('user', JSON.stringify(minimalUser))
    } catch (e) {
      // A no-longer-valid session (revoked/expired token or a deactivated
      // account) must not keep browsing on a stale cached role. Transient
      // network/server errors keep the cached user so the app still loads.
      if (isAxiosError(e) && (e.response?.status === 401 || e.response?.status === 403)) {
        await logout()
      }
    }
  }

  const logout = async (isTokenExpired: boolean = false) => {
    // Best-effort: notify backend to blacklist the token
    // Still clear client state even if the API call fails
    try {
      if (token.value) {
        await logoutApi()
      }
    } catch {
      // Silently ignore — client-side cleanup still happens below
    }

    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    if (isTokenExpired) {
      isSessionTerminated.value = true
    }
  }

  const clearSessionTerminated = () => {
    isSessionTerminated.value = false
  }

  return {
    token,
    user,
    isSessionTerminated,
    isAuthenticated,
    getAccessToken,
    loginAction,
    refreshUser,
    logout,
    clearSessionTerminated,
  }
})
