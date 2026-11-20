import { defineConfig } from 'vite';
export default defineConfig(({ mode }) => ({
  define: {
    'import.meta.env.VITE_LOCAL_SAMPLE_METRICS': JSON.stringify(
      mode === 'test' && process.env.FAMILY_PAWS_LOCAL_DEMO === 'true' ? 'true' : 'false',
    ),
  },
  server: {
    host: mode === 'test' ? '127.0.0.1' : 'localhost',
    proxy: { '/api': mode === 'test' ? 'http://127.0.0.1:8081' : 'http://127.0.0.1:8080' },
  },
}));
