# AI Instructions — RoutinCafe_POS Frontend

> **This file is mandatory reading for all developers and AI agents working on this codebase.**

---

## Architecture: Layered Frontend Pattern

All features **MUST** follow this strict layered architecture:

```text
View → Component → Store → API Layer
```

### Layer Responsibilities

| Layer            | File Location     | Responsibility                                                             |
| ---------------- | ----------------- | -------------------------------------------------------------------------- |
| **View**         | `src/views/`      | Page-level components mapped by Vue Router. Compose child components.      |
| **Component**    | `src/components/` | Reusable, stateless UI components. Usually primitive Shadcn UI blocks.     |
| **Store**        | `src/store/`      | Pinia stores for global state. Single source of truth for shared data.     |
| **API Endpoint** | `src/api/`        | HTTP client functions exporting Axios requests. **BANNED: src/services/**. |

### Core AI Rules & Constraints

1. **API Layer (`src/api/`)**:
   - `src/services/` is strictly **BANNED**. Do not create it.
   - All network calls must be exported as simple vanilla async functions mapped to Axios inside `src/api/<domain>.ts`.
2. **Schema Validation (`src/validations/`)**:
   - Manual form validation is **BANNED**.
   - All data payloads MUST be validated using `zod` schemas before triggering API calls or Store actions.
3. **The Magic String Ban (I18N)**:
   - Hardcoded English GUI text inside `.vue` files is **BANNED**.
   - You MUST utilize `vue-i18n` using `const { t } = useI18n()` and map strings to keys defined in both `src/i18n/locales/en.json` and `kh.json`.
4. **The Route Configuration Ban**:
   - Magic strings like `router.push('/login')` are **BANNED**.
   - You MUST structure routes dynamically leveraging constants declared in `src/constants/appRoutes.ts` (e.g. `APP_ROUTES.LOGIN.name`).
5. **UI & Styling Constraints**:
   - **BANNED**: Writing vanilla CSS. Use `tailwindcss` exclusively.
   - **BANNED**: Writing custom HTML generic buttons. Use `shadcn-vue`-generated primitives in `src/components/ui/` universally.
6. **ESLint & Prettier Strict Adherence**:
   - **Single Quotes & No Semicolons** naturally enforced by `.prettierrc`.
   - **BANNED**: The `any` TypeScript type is strictly prohibited (`Unexpected any` will fail CI/CD).
   - HTML Attributes MUST be strictly ordered: `v-model` must mathematically precede standard attributes like `type` and `@submit`.

---

## File Naming Conventions (camelCase standard)

| Type       | Pattern                 | Example                              |
| ---------- | ----------------------- | ------------------------------------ |
| View       | `<Entity>View.vue`      | `HomeView.vue`, `LoginView.vue`      |
| Component  | `<Entity><Role>.vue`    | `ShopCard.vue`, `OrderTable.vue`     |
| Store      | `use<Name>Store.ts`     | `useAuthStore.ts`, `useShopStore.ts` |
| API Layer  | `<entity>.ts`           | `auth.ts`, `shop.ts`                 |
| Type/Model | `<entity>.types.ts`     | `shop.types.ts`, `user.types.ts`     |
| Validation | `<entity>Validation.ts` | `authValidation.ts`                  |

## Anti-Spaghetti Rules (Strict Adherence Required)

1. **Composition API Only**: The Options API is **BANNED**. All components must use `<script setup lang="ts">`.
2. **Strict API Isolation**: API definitions (`axios.post`) are BANNED in Views, Components, and Stores. They belong exclusively in `src/api/`. Stores call the `src/api/` exported functions.
3. **Typed Everything**: All props, Zod inferences, API responses, and store states must be explicitly typed with TypeScript interfaces inside `src/types/`.
