/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// Game versions are selected at runtime (versions/registry.ts, loaded by
// src/main.tsx before the app boots); one build carries all of them.

export default defineConfig({
  base: './',
  plugins: [],
  /**
   * The two services the UI talks to, each its own process. Proxied here so
   * they are same-origin in dev; in production the shop is published under
   * `/api` on the client host and the register service answers by name on
   * `register.<domain>` (see `serverServices.ts`).
   *
   * `/api/register` is listed first: vite takes the first rule that matches,
   * and `/api` matches it too.
   */
  server: {
    proxy: {
      '/api/register': {
        target: `http://127.0.0.1:${process.env.REGISTER_API_PORT ?? 3100}`,
        changeOrigin: false,
      },
      '/api': {
        target: `http://127.0.0.1:${process.env.CASHSHOP_API_PORT ?? 3200}`,
        changeOrigin: false,
      },
    },
  },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0, //disable
    cssTarget: 'chrome100',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Function form: assigns exactly these modules, nothing rides along.
        manualChunks(id: string) {
          // The generated packet classes are ~40 000 lines and were the bulk
          // of the app chunk (todo C9). They import only common/binaryUtils
          // and common/types, both engine-free, so they split cleanly; while
          // they still imported common/utils this dragged 2.4 MB of Babylon
          // into the chunk with them.
          if (/\/src\/common\/packets\/(ServerToClient|ClientToServer|ConnectServer)Packets\.ts$/.test(id)) {
            return 'packets';
          }
          if (/@babylonjs\/(core|loaders|materials)\//.test(id)) return 'bjs';
        },
      },
    },
  },
  define: {
    APP_VERSION: JSON.stringify(process.env.npm_package_version),
    APP_STAGE: JSON.stringify(process.env.APP_ENV || 'unk'),
    QA_ENABLED: JSON.stringify(process.env.QA ? 'true' : ''),
    'import.meta.env.QA_ENABLED': JSON.stringify(
      process.env.QA ? 'TEST MODE ENABLED' : ''
    ),
  },
  optimizeDeps: {
    force: true,
  },
  test: {
    // Tests skip main.tsx, so the default version is loaded here instead.
    setupFiles: ['./src/version/testSetup.ts'],
    // The marketplace service stores its listings in `bun:sqlite`, which
    // vitest runs under node and cannot import. Those tests are run by
    // `bun test` instead (`bun run test:server`).
    exclude: ['**/node_modules/**', '**/dist/**', 'marketplace/server/**'],
  },
});
