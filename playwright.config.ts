import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";

const authState = ".playwright-auth/user.json";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3101",
    channel: "msedge",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "public-mobile",
      testIgnore: /authenticated\.spec\.ts/,
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "public-tablet",
      testIgnore: /authenticated\.spec\.ts/,
      use: { viewport: { width: 768, height: 1024 } },
    },
    {
      name: "public-desktop",
      testIgnore: /authenticated\.spec\.ts/,
      use: { viewport: { width: 1440, height: 900 } },
    },
    ...(fs.existsSync(authState)
      ? [
          {
            name: "authenticated-desktop",
            testMatch: /authenticated\.spec\.ts/,
            use: {
              viewport: { width: 1440, height: 900 },
              storageState: authState,
            },
          },
        ]
      : []),
  ],
  webServer: {
    command:
      "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3101",
    url: "http://127.0.0.1:3101/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
