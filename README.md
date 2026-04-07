# RoutinCafe POS Frontend 🚀

Welcome to the **RoutinCafe POS** frontend repository! This application is built with Vue 3 (Composition API), Vite, TypeScript, Tailwind CSS, and shadcn-vue.

## 🛠️ Technology Stack

- **Framework:** Vue 3 (Composition API + `<script setup>`)
- **Build Tool:** Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 + shadcn-vue
- **State Management:** Pinia
- **Routing:** Vue Router 4
- **Internationalization:** Vue I18n (EN / KH)
- **Linting:** ESLint + Prettier

---

## 📖 Mandatory Reading for Developers

Before you write your first line of code, you must read the internal documentation:

1. [**Developer Guide**](./DEVELOPER_GUIDE.md) - Explains the layered architecture and anti-spaghetti code constraints.
2. [**AI Instructions**](./AI_INSTRUCTIONS.md) - Naming patterns and automated constraints for AI coding assistants.

---

## ⚙️ Getting Started (Local Setup)

### Prerequisites

- Node.js (v18+)
- Git

### 1. Clone the repository

```bash
git clone https://github.com/AEU-THESIS/frontend.git
cd frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup Environment Variables

```bash
cp .env.example .env
```

Open `.env` and configure:

```env
VITE_API_URL=http://localhost:3000
```

### 4. Run the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### 5. Build for Production

```bash
npm run build
```

Output will be generated in the `dist/` directory.

---

## 📦 Adding shadcn-vue Components

To add a new UI component from the shadcn-vue registry:

```bash
npx shadcn-vue@latest add <component-name>
```

Example:

```bash
npx shadcn-vue@latest add button
npx shadcn-vue@latest add input
npx shadcn-vue@latest add dialog
```

Components are installed to `src/components/ui/`.

---

## 🌐 Internationalization (I18n)

This project strictly bans magic English strings in templates and instead supports native translation engines for English (`en`) and Khmer (`kh`) locales.

- Locale files: `src/i18n/locales/en.json` and `src/i18n/locales/kh.json`
- Usage in templates: `{{ t('auth.login') }}`
- Usage in `<script setup>`: `const { t } = useI18n();`

---

## 👨‍💻 Workflow Overview

To add a new domain feature (e.g., `Orders`), strictly map this execution order:

1. Define the rigorous Zod data payload schemas in `src/validations/orderValidation.ts`.
2. Connect standard Axios endpoint wrappers in the flat `src/api/order.ts`.
3. Build the Memory Cache explicitly inside the Setup Store format in `src/store/useOrderStore.ts`.
4. Run `npx shadcn-vue@latest add` to pull needed generic primitives into `src/components/ui/`.
5. Assemble the page logic globally in `src/views/OrderView.vue`.
6. Inject the immutable route path in `src/constants/app-routes.ts` before binding it to Vue-Router at `src/router/index.ts`.
