import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          markdown: [
            'react-markdown',
            'rehype-highlight',
            'rehype-katex',
            'rehype-raw',
            'rehype-sanitize',
            'remark-gfm',
            'remark-math',
          ],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  server: {
    proxy: { '/api': 'http://localhost:8000' },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
