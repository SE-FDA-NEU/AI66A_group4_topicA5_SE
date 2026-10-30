import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const frontend = fileURLToPath(new URL(".", import.meta.url));
const backend = resolve(frontend, "../backend");
const localPython = resolve(backend, process.platform === "win32" ? ".venv/Scripts/python.exe" : ".venv/bin/python");
const python = process.env.P0_PYTHON || (existsSync(localPython) ? localPython : "python");

export default defineConfig({
  testDir: "./browser",
  timeout: 90_000,
  expect: { timeout: 8_000 },
  workers: 1,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "test-results/p0-report.json" }]],
  use: {
    baseURL: "http://127.0.0.1:5186",
    channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
  },
  webServer: [
    { name: "P0 isolated API", command: `"${python}" -B tests/browser_server.py --port 8016`,
      cwd: backend, url: "http://127.0.0.1:8016/health", reuseExistingServer: false },
    { name: "P0 frontend", command: `"${process.execPath}" node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5186 --strictPort`,
      cwd: frontend, url: "http://127.0.0.1:5186", reuseExistingServer: false,
      env: { P0_TEST_API_TARGET: "http://127.0.0.1:8016" } },
  ],
});
