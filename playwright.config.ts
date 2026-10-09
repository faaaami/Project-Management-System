import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './browser-tests',
  workers: 1,
  use: { channel: 'msedge', headless: true, baseURL: 'http://127.0.0.1:4173', viewport: { width: 1440, height: 1000 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI },
})
