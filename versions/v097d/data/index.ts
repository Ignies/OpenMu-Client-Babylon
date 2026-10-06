/**
 * Where the 0.97d assets live.
 *
 * `folder` is the period `Data/` tree the client fetches directly (interface
 * sprites, the logo, `Local/*.bmd`, gate.bmd, minimap tiles). It sits beside
 * the Season 6 `Data/` at the repo root as `Data-v097d/`, served by `vite
 * dev` the same way, and copied into `dist/Data-v097d` by the build
 * (`tools/copyData.ts --src Data-v097d`).
 *
 * `assets` is the converted model / terrain / sound tree. It holds only what
 * 0.97d ships differently from Season 6 (`assets.ts`); every other converted
 * file is Season 6's, byte-identical at the source, and is read from its tree
 * (`borrows`).
 *
 * 0.97d keeps its language tables directly under `Local/` (no `Eng/`
 * subfolder yet), so the locale is the empty string.
 */
import type { VersionData } from '@/version/contract';
import { season6Data } from '../../season6/data';
import { V097D_ASSET_FILES } from './assets';
import { V097D_DATA_FILES } from './inventory';
import { V097D_SOUNDS } from './sounds';

function withTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`;
}

export const v097dData: VersionData = {
  folder: withTrailingSlash(import.meta.env.VITE_DATA_URL_V097D || './Data-v097d/'),
  assets: './game-assets-v097d/',
  locale: '',
  inventory: new Set(V097D_DATA_FILES),
  borrows: {
    assets: season6Data.assets,
    ownAssets: new Set(V097D_ASSET_FILES),
  },
  sounds: V097D_SOUNDS,
};
