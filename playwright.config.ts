import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:5173',
    ...devices['Pixel 7']
  },
  webServer: [
    {
      command: 'pnpm exec tsx server/index.ts',
      port: 3001,
      reuseExistingServer: true
    },
    {
      command: 'pnpm exec vite --host 0.0.0.0',
      port: 5173,
      reuseExistingServer: true
    }
  ]
});
