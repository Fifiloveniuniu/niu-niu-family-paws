import { defineConfig } from 'vite';
export default defineConfig(({ mode }) => ({
  server: {
    host: mode === 'test' ? '127.0.0.1' : 'localhost',
    proxy: { '/api': mode === 'test' ? 'http://127.0.0.1:8081' : 'http://127.0.0.1:8080' },
  },
}));
