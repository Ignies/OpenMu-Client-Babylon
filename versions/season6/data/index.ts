/**
 * Where the Season 6 assets live. `vite dev` serves the `client/Data`
 * junction at `/Data/`; `bun run build` copies the fetched subset into
 * `dist/Data` (tools/copyData.ts). `VITE_DATA_URL` moves the original tree
 * to a CDN / other origin at build time.
 */
import type { VersionData } from '@/version/contract';

function withTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`;
}

export const season6Data: VersionData = {
  folder: withTrailingSlash(import.meta.env.VITE_DATA_URL || './Data/'),
  assets: './game-assets/',
  locale: 'Eng',
  // Every World / Object folder a map entry reads (tools/assetsIndex.test.ts). Not World6 (Exile),
  // World55/56 or Object55/56 (the old character and login scenes): its trees hold them, nothing reads them.
  worlds: [
    1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 19, 25, 31, 32, 34, 35, 38, 39, 40, 41, 42, 43, 47, 52, 57,
    58, 59, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 78, 79, 80, 81, 82,
  ],
};
