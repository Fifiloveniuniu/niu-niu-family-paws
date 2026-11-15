import { defineConfig } from 'vite';
export default defineConfig(({ mode }) => {
  const staging = mode === 'staging';
  return {
    build: { outDir: staging ? 'dist-dev' : 'dist' },
    define: { __STAGING__: JSON.stringify(staging) },
    server: { proxy: { '/api': 'http://127.0.0.1:8080' } },
  };
});
