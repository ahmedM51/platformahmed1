
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // المفتاح الجديد كمتغير بيئة داخلي
    'process.env.API_KEY': JSON.stringify('AIzaSyBNkAIB1P5lFmfrBKTCf9oPtSxcWvJCBpw'),
    'global': 'window',
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
  }
});
