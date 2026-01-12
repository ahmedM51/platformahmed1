
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // تعريف كائن process.env لمنع أخطاء ReferenceError في المتصفح
    'process.env': {
      API_KEY: JSON.stringify(process.env.API_KEY || ''),
      SUPABASE_URL: JSON.stringify(process.env.SUPABASE_URL || ''),
      SUPABASE_ANON_KEY: JSON.stringify(process.env.SUPABASE_ANON_KEY || '')
    },
    'global': 'window'
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
