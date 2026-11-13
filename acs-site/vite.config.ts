import { defineConfig } from 'vite';

// Vite only serves the already-built dist/ for preview and e2e. The build
// itself is scripts/build.ts.
export default defineConfig({
  appType: 'mpa',
  preview: { port: 4173, strictPort: true, host: '127.0.0.1' },
});
