import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');
  
  // Detect GitHub Pages deployment
  const isGitHubPages = mode === 'production';
  const basePath = isGitHubPages ? '/smart-student' : '/';

  return {
    plugins: [react()],
    define: {
      // ✅ Fix: Use VITE_ prefixed variables (Vite standard)
      'process.env': {
        SUPABASE_URL: JSON.stringify(env.VITE_SUPABASE_URL || ''),
        SUPABASE_ANON_KEY: JSON.stringify(env.VITE_SUPABASE_ANON_KEY || '')
      },
      'global': 'window',
      // Add GitHub Pages detection
      __IS_GITHUB_PAGES__: JSON.stringify(isGitHubPages),
      __BASE_PATH__: JSON.stringify(basePath)
    },
    base: basePath,
    build: {
      outDir: 'dist',
      sourcemap: false,
      // Static export for GitHub Pages
      rollupOptions: {
        input: {
          main: './index.html'
        }
      }
    },
    server: {
      port: 3000,
      open: true
    }
  };
});
