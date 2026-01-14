
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // المفتاح الجديد الذي زودتنا به للعمل في بيئة الإنتاج
    'process.env.API_KEY': JSON.stringify('AIzaSyBDReabbWtJPI31sPz6XHZ-vWT19vY7jCI'),
    'global': 'window',
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
  }
});
