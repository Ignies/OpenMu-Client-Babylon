import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

/**
 * `@version` -> `versions/<VITE_GAME_VERSION>` (default `season6`). The base
 * game imports version-specific packets / tables / UI / the `gameVersion`
 * entry only through this alias . Keep in step with
 * `paths` in tsconfig.json.
 */
const GAME_VERSION = process.env.VITE_GAME_VERSION || 'season6';
const versionDir = fileURLToPath(new URL(`./versions/${GAME_VERSION}`, import.meta.url));

export default defineConfig({
  base: './',
  plugins: [],
  resolve: {
    alias: [{ find: /^@version(\/|$)/, replacement: `${versionDir}$1` }],
  },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0, //disable
    cssTarget: 'chrome100',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // The generated packet classes are ~40 000 lines and were the bulk
          // of the app chunk (todo C9). They import only common/binaryUtils
          // and common/types, both engine-free, so they split cleanly; while
          // they still imported common/utils this dragged 2.4 MB of Babylon
          // into the chunk with them.
          packets: [
            './src/common/packets/ServerToClientPackets.ts',
            './src/common/packets/ClientToServerPackets.ts',
            './src/common/packets/ConnectServerPackets.ts',
          ],
          bjs: [
            '@babylonjs/core',
            '@babylonjs/loaders',
            '@babylonjs/materials',
          ],
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
    'import.meta.env.VITE_GAME_VERSION': JSON.stringify(GAME_VERSION),
  },
  optimizeDeps: {
    force: true,
  },
});
