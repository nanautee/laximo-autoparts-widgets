import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2019',
    sourcemap: false,
    rollupOptions: {
      input: {
        // Demo/showcase page that hosts all three widgets
        demo: r('./index.html'),
        // Standalone bundle of the embeddable widgets for a shop page
        widgets: r('./src/embed.ts'),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'widgets' ? 'autoparts-widgets.js' : 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        format: 'es',
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
