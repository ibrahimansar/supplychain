import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/react/' : '/',
  build: { outDir: '../app/react', emptyOutDir: true },
  server: { port: 8081, strictPort: true, proxy: { '/odata': 'http://localhost:8080' } },
}));
