import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // تحميل متغيرات البيئة بناءً على الوضع (development أو production)
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // تمرير المفتاح ليكون متاحاً في الكود البرمجي
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY),
      'global': 'window',
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    }
  };
});
