import { defineConfig, devices } from '@playwright/test'

// E2E конструктора. Прогон против preview-сборки (.output). Тесты — в e2e/,
// vitest держит свои в tests/, пересечения нет.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    locale: 'ru-RU',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run preview -- --port 4173',
    url: 'http://127.0.0.1:4173',
    timeout: 120_000,
    reuseExistingServer: false,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
