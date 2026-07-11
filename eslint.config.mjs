// @ts-check
// Базу (project-aware) генерирует @nuxt/eslint; форматирование отдано Prettier —
// eslint-config-prettier гасит конфликтующие стилевые правила.
import withNuxt from './.nuxt/eslint.config.mjs'
import prettier from 'eslint-config-prettier'

export default withNuxt(
  {
    rules: {
      // имена страниц/лейаутов часто односложные (index.vue, cart.vue) — это нормально
      'vue/multi-word-component-names': 'off',
      // избыточно с <script setup lang="ts">: optional-проп уже типизирован как T|undefined,
      // а `default: undefined` — no-op. Правило давало только шум на UI-компонентах.
      'vue/require-default-prop': 'off',
      // Konva/canvas-обработчики и сторонние типы прагматично используют any — предупреждение, не блок
      '@typescript-eslint/no-explicit-any': 'warn',
      // паттерн `cond && fn()` в обработчиках — допустим, понижаем до предупреждения
      '@typescript-eslint/no-unused-expressions': 'warn',
      // неразрывный пробел перед валютой (₸) — намеренная русская типографика
      'no-irregular-whitespace': ['error', { skipStrings: true, skipTemplates: true }],
    },
  },
  prettier,
)
