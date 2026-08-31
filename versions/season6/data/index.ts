/**
 * Where the Season 6 assets live. `vite dev` serves the `client/Data`
 * junction at `/Data/`; `bun run build` copies the fetched subset into
 * `dist/Data` (tools/copyData.ts). `VITE_DATA_URL` moves the original tree
 * to a CDN / other origin at build time.
 */
import type { VersionData } from '../../../src/version/contract';

function withTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`;
}

export const season6Data: VersionData = {
  folder: withTrailingSlash(import.meta.env.VITE_DATA_URL || './Data/'),
  assets: './game-assets/',
  locale: 'Eng',
};
