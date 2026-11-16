import { defineConfig } from "@playwright/test";
// Screen pictures for design review; kept apart from the e2e checks in ./e2e.
export default defineConfig({
  testDir: "./screens",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 390, height: 844 },
    locale: "ko-KR",
  },
  webServer: {
    command: "node scripts/serve-web.mjs",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});
