import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

/**
 * The register page is its own Vite app, not a route in the client: it is
 * served from its own host, and it must not drag in Babylon, the packet
 * layer, or the 800 MB asset tree to draw one window.
 *
 * It shares exactly one module with the client — `libs/mu/tga` — which is why
 * `server.fs.allow` reaches up to the repo root in dev.
 *
 * Build:  bun run --cwd register build   ->  dist-register/
 */

const root = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  root,
  base: './',
  build: {
    target: 'es2022',
    outDir: fileURLToPath(new URL('../dist-register', import.meta.url)),
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    fs: {
      allow: [repoRoot],
    },
  },
});
