import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The API runs at http://localhost:3000; the web dev server at http://localhost:5173.
// We proxy /api (including Auth.js routes under /api/auth/*) to the API.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
