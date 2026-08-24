import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Keeps hashes for all chunk assets to break Cache, but simplifies named extraction
        assetFileNames: assetInfo => {
          const ext = path.extname(assetInfo.names[0] ?? '')
          if (ext === '.pdf') {
            return 'assets/[name][extname]' // No hash for PDFs if you upload documentation later
          }
          return 'assets/[name]-[hash][extname]' // Standard Cache-busting hash
        },
        // Functional manual chunks avoids TypeScript Union Type bugs in Vite.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('vue') || id.includes('pinia')) {
              return 'vendor'
            }
            if (id.includes('lucide')) {
              return 'icons'
            }
            if (id.includes('axios') || id.includes('zod')) {
              return 'utils'
            }
            // Excel export only — dynamically imported, so this chunk is
            // fetched on demand rather than on every page load.
            if (id.includes('exceljs')) {
              return 'exceljs'
            }
            if (id.includes('chart.js')) {
              return 'chartjs'
            }
            if (id.includes('reka-ui')) {
              return 'reka-ui'
            }
            return 'deps'
          }
        },
      },
    },
  },
})
