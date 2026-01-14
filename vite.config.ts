
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Vite replaces these values during build time
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || 'AIzaSyBDReabbWtJPI31sPz6XHZ-vWT19vY7jCI'),
    'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || 'https://pxmhwwovxrnefiryywva.supabase.co'),
    'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4bWh3d292eHJuZWZpcnl5d3ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MzgzNjQsImV4cCI6MjA3MjAxNDM2NH0.FqzkWel93icaJ781ZCPhvzfVJu4iwqCa3hxV3AKuRlA'),
    'global': 'window',
    'process.version': JSON.stringify('v16.0.0')
  },
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', '@google/genai', '@supabase/supabase-js']
        }
      }
    }
  }
});
