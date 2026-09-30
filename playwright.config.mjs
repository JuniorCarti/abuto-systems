import { defineConfig, devices } from "@playwright/test";

const previewBaseURL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    channel: "msedge",
    baseURL: previewBaseURL ?? "http://127.0.0.1:3002",
    trace: "retain-on-failure",
  },
  webServer: previewBaseURL
    ? undefined
    : {
        command: "npm run cf:preview -- --port 3002",
        url: "http://127.0.0.1:3002",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
