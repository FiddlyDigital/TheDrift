import { defineConfig, devices } from '@playwright/test';

// Visual screenshot pass for the immersive redesign. Runs in CI (see
// .github/workflows/screenshots.yml), which installs Playwright + Chromium and
// uploads the PNGs as a build artifact. Kept out of the unit-test run (Vitest
// only matches *.test.*); these specs are *.e2e.js.
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.js',
  outputDir: './e2e/.output',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4173', trace: 'off' },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
});
