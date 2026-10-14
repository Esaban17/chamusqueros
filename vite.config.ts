import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { viteSingleFile } from 'vite-plugin-singlefile';

// "single" mode bundles everything into one HTML file for quick previews.
export default defineConfig(({ mode }) =>
  mode === 'single'
    ? { plugins: [viteSingleFile()], build: { outDir: 'dist-single' } }
    : {
        build: {
          rollupOptions: {
            input: {
              main: resolve(__dirname, 'index.html'),
              privacidad: resolve(__dirname, 'privacidad.html'),
              terminos: resolve(__dirname, 'terminos.html'),
            },
          },
        },
      },
);
