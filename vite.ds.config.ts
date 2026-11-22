import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Builds the standalone design system site into dist-ds/ (one page, one script).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'dist-ds', rollupOptions: { input: 'design-system.html' } },
})
