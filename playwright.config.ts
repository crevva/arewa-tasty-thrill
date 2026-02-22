import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  use: {
    baseURL: process.env.APP_BASE_URL ?? "http://localhost:3000",
    headless: true
  },
  retries: 0,
  reporter: "list"
});
