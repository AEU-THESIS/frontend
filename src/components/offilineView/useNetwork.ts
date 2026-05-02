import { ref, onMounted, onUnmounted } from 'vue'

export function useNetwork() {
  const isOnline = ref(window.navigator.onLine)

  const updateStatus = () => {
    isOnline.value = window.navigator.onLine
  }

  onMounted(() => {
    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)
  })

  onUnmounted(() => {
    window.removeEventListener('online', updateStatus)
    window.removeEventListener('offline', updateStatus)
  })

  return { isOnline }
}