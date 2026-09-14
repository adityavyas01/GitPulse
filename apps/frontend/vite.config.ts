import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Week 12: three.js (~730 kB minified) is inherently a large vendor
    // chunk; it is split from app code and cached separately.
    chunkSizeWarningLimit: 800,
    // Split heavy vendor libraries into cacheable
    // chunks so the application code ships in its own small bundle.
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          react: ['react', 'react-dom', '@react-three/fiber', '@react-three/drei']
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      // Frontend consumes the backend API same-origin in development.
      '/api': { target: 'http://localhost:3000', changeOrigin: true }
    }
  }
});
