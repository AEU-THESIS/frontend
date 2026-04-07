import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import vueTsEslintConfig from '@vue/eslint-config-typescript'

export default [
  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/node_modules/**'],
  },
  ...pluginVue.configs['flat/recommended'],
  ...vueTsEslintConfig({
    // Enables highly strict TypeScript rules
    strict: true,
  }),
  skipFormatting,
  {
    name: 'app/custom-rules',
    rules: {
      // General Vue
      'vue/multi-word-component-names': 'off',
      'vue/no-reserved-component-names': 'off',
      'vue/require-default-prop': 'off',
      // Forces `<script setup>` over legacy Options API
      'vue/component-api-style': ['error', ['script-setup', 'composition']],

      // TypeScript strictness
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
]
