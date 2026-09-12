import { defineConfig } from "@playwright/test";

const python = process.platform === "win32" ? "../../.venv/Scripts/python.exe" : "../../.venv/bin/python";
const baseURL = "http://127.0.0.1:8001";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 60000,
  use: {
    baseURL,
    headless: true,
    launchOptions: process.platform === "win32" ? { executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" } : {},
    screenshot: "only-on-failure",
  },
  // Build the frontend before running Playwright. This fixture uses only a
  // temporary database and fake delivery, never the user's running application.
  webServer: {
    command: `"${python}" "../backend/tests/browser_server.py"`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 90000,
  },
});
