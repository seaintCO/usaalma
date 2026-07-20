import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";

const authState = ".playwright-auth/user.json";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
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
});
