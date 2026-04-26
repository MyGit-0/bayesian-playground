import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    visualizer({          // Add this last
      open: true,         // Auto-open browser
      gzipSize: true,     // Show gzip sizes
      brotliSize: true,   // Show brotli sizes
    })
  ],
  build: {
    rollupOptions: {
      external: [], 
      output: {
        manualChunks(id) {
          if (id.includes('katex')) return 'math'
        }
      }
    }
  }
})