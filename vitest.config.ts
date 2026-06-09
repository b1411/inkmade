import { defineConfig } from 'vitest/config'

// Юнит-тесты чистой доменной логики (§testing). Покрывают денежную/статусную логику,
// импортируемую и клиентом, и сервером (shared/config/*). Без Nuxt/DOM — node-окружение.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
