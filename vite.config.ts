
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Vite يقوم تلقائياً بتبديل process.env بالقيم من Vercel
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    'global': 'window',
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
  }
});
