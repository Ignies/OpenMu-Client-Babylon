import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// The landing page's moving backdrop and logo light, bundled for the PHP site (website/readme.md).
// Root is the repo so the i18n glob ('/src/**', '/versions/**') resolves as in the client.
// Build: bun run build:site-fx -> website/config/resources/js/fx/

const at = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  root: at('../..'),
  base: '/config/resources/js/fx/',
  publicDir: false,
  resolve: {
    alias: [
      { find: /^@\/i18n$/, replacement: at('./i18n.ts') },
      { find: /^@\/modules\/credits$/, replacement: at('../../src/modules/credits/contributors.ts') },
      { find: /^@\//, replacement: at('../../src/') },
      { find: /^@versions\//, replacement: at('../../versions/') },
    ],
  },
  build: {
    target: 'es2022',
    outDir: at('../config/resources/js/fx'),
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: at('./main.tsx'),
      output: { entryFileNames: 'fx.js', assetFileNames: 'fx[extname]', inlineDynamicImports: true },
    },
  },
});
