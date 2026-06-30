import { defineConfig } from 'vitest/config'

// Интеграционные RLS-тесты против РЕАЛЬНОГО Supabase (PostgREST + JWT обычного пользователя).
// Отдельный конфиг, чтобы юнит-прогон (npm test) их не трогал — нужны секреты и тест-аккаунт.
// Запуск: npm run test:rls (CI job rls-security; без секретов тесты self-skip через runIf).
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
