import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isGitHubPages = mode === 'production';
  
  // ✅ FIXED: Define base path properly
  const basePath = isGitHubPages ? '/platformahmed1/' : '/';

  return {
    plugins: [react(), tailwindcss(),],
    // ✅ FIXED: Use basePath correctly
    base: basePath,
    define: {
      'process.env': {
        SUPABASE_URL: JSON.stringify(env.VITE_SUPABASE_URL || ''),
        SUPABASE_ANON_KEY: JSON.stringify(env.VITE_SUPABASE_ANON_KEY || '')
      },
      'global': 'window',
      __IS_GITHUB_PAGES__: JSON.stringify(isGitHubPages),
      // ✅ FIXED: Use defined basePath
      __BASE_PATH__: JSON.stringify(basePath)
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        // ✅ FIXED: Remove unnecessary input (causes issues)
        // input: { main: './index.html' }  // DELETE THIS
      }
    },
    server: {
      port: 3000,
      open: true
    }
  };
});
