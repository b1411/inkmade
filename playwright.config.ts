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
    { name: 'chromium', testIgnore: /mobile\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', testIgnore: /mobile\.spec\.ts/, use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', testIgnore: /mobile\.spec\.ts/, use: { ...devices['Desktop Safari'] } },
    { name: 'android-chrome', testMatch: /mobile\.spec\.ts/, use: { ...devices['Pixel 7'] } },
    { name: 'iphone-safari', testMatch: /mobile\.spec\.ts/, use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run preview -- --port 4173',
    url: 'http://127.0.0.1:4173',
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      NUXT_PUBLIC_E2E_SEEDED: 'true',
    },
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
