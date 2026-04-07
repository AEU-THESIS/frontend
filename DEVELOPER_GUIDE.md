# RoutinCafe POS Developer Guide (Frontend)

Welcome to the frontend architecture! This Vue 3 + Vite application is built with a strictly typed, component-driven architecture logically unified under the Shadcn-Vue design system.

## Directory Structure

- `/src/api/`: Fast, flat HTTP client wrappers using Axios. (Services folder intentionally deprecated).
- `/src/components/ui/`: Auto-generated Shadcn-Vue base UI primitives.
- `/src/store/`: Pinia global state stores for reactive application memory cache.
- `/src/validations/`: Zod parsing schemas intercepting all data payloads.
- `/src/router/`: Typed Vue Router configuration tied to strict route constants.
- `/src/i18n/`: Internal localization files mapping Magic Strings (`en.json` & `kh.json`).

## The 4-Step Feature Pattern Blueprint

Whenever you build a new vertical feature slice (ex: Shops, Products), rigidly map to this structure:

**1. Data & Schema Alignment (Types & Validations)**
Map the Backend Schema rigorously to the Frontend.

```typescript
// src/validations/shopValidation.ts
import { z } from 'zod'

export const shopSchema = z.object({
  name: z.string().min(1, 'Name is required'),
})

export type ShopInput = z.infer<typeof shopSchema>
```

**2. The Flat API Layer (src/api/)**
Write standard asynchronous functions wrapped around your Axios Interceptor.

```typescript
// src/api/shop.ts
import http from './api'
import type { ShopInput } from '@/validations/shopValidation'

export const createShop = async (payload: ShopInput) => {
  const res = await http.post('/api/shops', payload)
  return res.data
}
```

**3. Pinia Store Memory (src/store/)**
Connect the functional API natively to physical State Management.

```typescript
// src/store/useShopStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { createShop } from '@/api/shop'
import type { ShopInput } from '@/validations/shopValidation'

export const useShopStore = defineStore('shop', () => {
  const isLoading = ref(false)

  const saveShopAction = async (payload: ShopInput) => {
    isLoading.value = true
    await createShop(payload)
    isLoading.value = false
  }

  return { isLoading, saveShopAction }
})
```

**4. The View Execution (src/views/)**
Assemble the primitives, intercept errors early, and render conditionally using translation keys.

```vue
<!-- src/views/CreateShopView.vue -->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useShopStore } from '@/store/useShopStore'

const { t } = useI18n()
const store = useShopStore()

const handleCreation = async () => {
  try {
     // Trigger frontend Zod parsing
     // Wait for Pinia Store resolution
  } catch (err) { ... }
}
</script>

<template>
  <Button @click="handleCreation">{{ t('shop.createButton') }}</Button>
</template>
```

## Security Overview

- Authentication tokens (JWT) are preserved in `localStorage` securely mapped by `useAuthStore.ts` initialization hooks across page reloads.
- Central `api.ts` interceptors uniformly evaluate `401 Unauthorized` states mathematically, instantly nullifying `localStorage` and rerouting to `APP_ROUTES.LOGIN`.
- User input payloads are mathematically sanitized by Zod BEFORE initiating asynchronous HTTP network traffic minimizing load on the Backend architecture.
