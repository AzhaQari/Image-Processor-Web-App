import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path" // Import path module

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // tsconfigPaths() // Removed vite-tsconfig-paths
  ],
  resolve: { // Added manual alias configuration
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: { // Added server proxy configuration
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
