
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // تم تحديث المفتاح الجديد الذي زودتنا به ليعمل كـ Backend مدمج
    'process.env.API_KEY': JSON.stringify('AIzaSyBNkAIB1P5lFmfrBKTCf9oPtSxcWvJCBpw'),
    'process.env.SUPABASE_URL': JSON.stringify('https://cmaxutqmblvvghftouqx.supabase.co'),
    'process.env.SUPABASE_ANON_KEY': JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4bWh3d292eHJuZWZpcnl5d3ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MzgzNjQsImV4cCI6MjA3MjAxNDM2NH0.FqzkWel93icaJ781ZCPhvzfVJu4iwqCa3hxV3AKuRlA'),
    'global': 'window',
    'process.env': {
      API_KEY: 'AIzaSyBNkAIB1P5lFmfrBKTCf9oPtSxcWvJCBpw'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  }
});
