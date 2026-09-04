/**
 * Where the 0.97d assets live.
 *
 * `folder` is the period `Data/` tree the client fetches directly (interface
 * sprites, the logo, `Local/*.bmd`, gate.bmd, minimap tiles). It sits beside
 * the Season 6 `Data/` at the repo root as `Data-v097d/`, served by `vite
 * dev` the same way, and copied into `dist/Data-v097d` by the build
 * (`tools/copyData.ts --src Data-v097d`).
 *
 * `assets` is the converted model / terrain tree. Only the maps that have
 * been run through `tools/` land there; see the version's README note in the
 * PR for what is still to convert.
 *
 * 0.97d keeps its language tables directly under `Local/` (no `Eng/`
 * subfolder yet), so the locale is the empty string.
 */
import type { VersionData } from '../../../src/version/contract';
import { V097D_DATA_FILES } from './inventory';

function withTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`;
}

export const v097dData: VersionData = {
  folder: withTrailingSlash(import.meta.env.VITE_DATA_URL_V097D || './Data-v097d/'),
  assets: './game-assets-v097d/',
  locale: '',
  inventory: new Set(V097D_DATA_FILES),
};
