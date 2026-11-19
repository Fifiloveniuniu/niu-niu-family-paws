import { defineConfig } from 'vite';
export default defineConfig({
  server: {
    host: 'localhost',
    proxy: { '/api': 'http://127.0.0.1:8092', '/__test-fixture': 'http://127.0.0.1:8092' },
  },
});
