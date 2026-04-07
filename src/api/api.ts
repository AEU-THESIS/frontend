import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import router from '@/router'
import { storeToRefs } from 'pinia'
import type { ApiResponse } from '@/types/auth.types'

import { useAuthStore } from '@/store/useAuthStore'
import { APP_ROUTES } from '@/constants/appRoutes'
import { ERROR_CODE } from '@/constants/errorCode'

export interface HttpInstance extends Omit<
  AxiosInstance,
  'get' | 'post' | 'put' | 'delete' | 'patch'
> {
  get<T = unknown, R = ApiResponse<T>, D = unknown>(
    url: string,
    config?: AxiosRequestConfig<D>
  ): Promise<R>
  post<T = unknown, R = ApiResponse<T>, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<R>
  put<T = unknown, R = ApiResponse<T>, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<R>
  delete<T = unknown, R = ApiResponse<T>, D = unknown>(
    url: string,
    config?: AxiosRequestConfig<D>
  ): Promise<R>
  patch<T = unknown, R = ApiResponse<T>, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<R>
}

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
}) as HttpInstance

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
    return response.data
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
