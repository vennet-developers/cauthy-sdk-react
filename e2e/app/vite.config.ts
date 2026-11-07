import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The demo application imports @cauthyhq/react as an application would; here
// that name is the sources, so the suite tests this checkout with no build.
const src = fileURLToPath(new URL('../../src/', import.meta.url))

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@cauthyhq\/react\/styles\.css$/, replacement: `${src}styles.css` },
      { find: /^@cauthyhq\/react$/, replacement: `${src}index.ts` },
    ],
  },
  build: { outDir: 'dist', emptyOutDir: true },
})
