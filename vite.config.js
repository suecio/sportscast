import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The website lives in web/ and is built into dist/, which the Worker serves.
// In development, "npm run dev" serves the site and sends /api to "wrangler dev".
export default defineConfig({
  root: 'web',
  plugins: [react()],
  build: { outDir: '../dist', emptyOutDir: true },
  server: { proxy: { '/api': 'http://localhost:8787' } },
});
