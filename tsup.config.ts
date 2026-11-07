import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'es2020',
  // React and the protocol client are the application's own copies.
  external: ['react', 'react/jsx-runtime', '@cauthyhq/js', '@cauthyhq/js/theme'],
  // What runs in the browser, marked as such: a framework with server
  // components (Next.js) takes it from one without being told.
  banner: { js: "'use client';" },
})
