import { defineConfig, loadEnv } from 'vite';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const staging = mode === 'staging';
  if (staging && (!env.VITE_FIREBASE_API_KEY || !env.VITE_FIREBASE_APP_ID)) {
    throw new Error('Staging requires its own Firebase API key and app ID in .env.staging.local');
  }
  return {
    build: { outDir: staging ? 'dist-dev' : 'dist' },
    define: { __STAGING__: JSON.stringify(staging) },
    server: { proxy: { '/api': 'http://127.0.0.1:8080' } },
  };
});
