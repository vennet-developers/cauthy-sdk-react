import { defineConfig } from 'vitest/config'

// Node by default (the server renderer); a test that needs a page says `// @vitest-environment jsdom`.
export default defineConfig({
  // The fixture check reads the route table of the sibling @cauthyhq/js checkout (../cauthy-sdk-js).
  server: { fs: { allow: ['.', '../cauthy-sdk-js'] } },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,tsx}', 'e2e/fixture/*.test.ts'],
  },
})
