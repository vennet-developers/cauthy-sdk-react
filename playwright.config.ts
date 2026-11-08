import { defineConfig, devices } from '@playwright/test'

// Which backend the browser talks to, always through the proxy on :4100:
//   node     @cauthyhq/node on its in-memory Cauthy (e2e/backends/node.ts)
//   record   the same, writing what crosses /api/auth into the protocol fixture
//   fixture  no backend: the proxy answers from e2e/fixture/auth-bff.v1.json
//   go       cauthy-sdk-go's backend at GO_BFF_URL, started by GO_BFF_CMD when set
const backend = (process.env.E2E_BACKEND ?? 'node') as 'node' | 'record' | 'fixture' | 'go'
const origin = 'http://localhost:4100'
const proxy = (mode: string, upstream?: string) => ({
  command: 'npx tsx e2e/servers/proxy.ts',
  url: `${origin}/__e2e/health`,
  env: { E2E_MODE: mode, ...(upstream ? { BACKEND_URL: upstream } : {}) },
  reuseExistingServer: false,
})
const node = { command: 'npx tsx e2e/backends/node.ts', url: 'http://localhost:4201/__e2e/health', env: { E2E_ORIGIN: origin }, reuseExistingServer: false }
const goUrl = process.env.GO_BFF_URL ?? 'http://localhost:4301'
const go = process.env.GO_BFF_CMD ? [{ command: process.env.GO_BFF_CMD, url: `${goUrl}/api/auth/session`, env: { E2E_ORIGIN: origin }, reuseExistingServer: false }] : []
const servers = {
  node: [node, proxy('live', 'http://localhost:4201')],
  record: [node, proxy('record', 'http://localhost:4201')],
  fixture: [proxy('replay')],
  go: [...go, proxy('live', goUrl)],
}[backend]
const everyBrowser = backend === 'node' || backend === 'go'

export default defineConfig({
  testDir: 'e2e/tests',
  // One backend process holds the accounts: the tests run one after another.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI && backend !== 'record' ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: { baseURL: origin, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ...(everyBrowser ? [{ name: 'firefox', use: { ...devices['Desktop Firefox'] } }, { name: 'webkit', use: { ...devices['Desktop Safari'] } }] : []),
  ],
  webServer: servers,
})
