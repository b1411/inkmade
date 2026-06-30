import { defineConfig, configDefaults } from 'vitest/config'

// Юнит-тесты чистой доменной логики (§testing). Покрывают денежную/статусную логику,
// импортируемую и клиентом, и сервером (shared/config/*). Без Nuxt/DOM — node-окружение.
// tests/integration — отдельный конфиг (vitest.integration.config.ts): нужны секреты+БД.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: [...configDefaults.exclude, 'tests/integration/**'],
    environment: 'node',
  },
})
