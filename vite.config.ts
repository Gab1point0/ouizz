import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// `base: './'` : fonctionne dans n'importe quel sous-dossier (GitHub Pages) grâce au routage par « # ».
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 900 },
  // host: true -> accessible depuis les téléphones du même Wi-Fi pendant le développement.
  server: { host: true },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
