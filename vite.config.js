import { defineConfig } from 'vite'

export default defineConfig({
  // Root is the Tutoring/ folder
  root: '.',

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Inline assets smaller than 4kb, externalize larger ones
    assetsInlineLimit: 4096,
  },

  server: {
    port: 3000,
    open: true,   // auto-open browser on npm run dev
    host: true,   // expose to local network (useful for WSL)
  },

  preview: {
    port: 4173,
    open: true,
  },
})
