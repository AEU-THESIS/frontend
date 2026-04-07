import axios from 'axios'
import router from '@/router'
import { storeToRefs } from 'pinia'

import { useAuthStore } from '@/store/useAuthStore'
import { APP_ROUTES } from '@/constants/app-routes'
import { ERROR_CODE } from '@/constants/error-code'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

http.interceptors.request.use(config => {
  const authStore = useAuthStore()
  const token = authStore.getAccessToken()

  if (authStore.isAuthenticated()) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

http.interceptors.response.use(
  response => {
    return Promise.resolve(response.data)
  },
  async error => {
    const authStore = useAuthStore()
    const { isSessionTerminated } = storeToRefs(authStore)
    const { logout } = authStore
    const status = error.response?.status
    const currentRoute = router.currentRoute.value
    const errorCode = error.response?.data?.errorCode

    if (
      errorCode === ERROR_CODE.SESSION_DETERMINED ||
      errorCode === ERROR_CODE.AUTH_TOKEN_EXPIRED
    ) {
      const isTokenExpired = errorCode === ERROR_CODE.AUTH_TOKEN_EXPIRED
      isSessionTerminated.value = true
      logout(isTokenExpired)
      return Promise.reject(error)
    }

    if (status === 401) {
      // Token is invalid, log out the user
      logout(false)
      // redirect to login page
      router.push({
        path: APP_ROUTES.LOGIN.path,
        query: { redirect: currentRoute.fullPath },
      })
    }
    return Promise.reject(error)
  }
)

export default http
