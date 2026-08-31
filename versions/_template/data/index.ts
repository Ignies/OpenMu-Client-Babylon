/**
 * TODO: asset roots for this version. The original `Data/` tree of another
 * version is not in the repo: place it beside `client/Data` (e.g.
 * `client/Data-<id>`, served by `vite dev` like `Data/`) or set
 * `VITE_DATA_URL`; convert its models / terrain / sounds with the scripts in
 * `tools/` into `public/game-assets-<id>/`.
 */
import type { VersionData } from '../../../src/version/contract';

function withTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`;
}

export const templateData: VersionData = {
  folder: withTrailingSlash(import.meta.env.VITE_DATA_URL || './Data-TODO/'),
  assets: './game-assets-TODO/',
  locale: 'Eng',
};
