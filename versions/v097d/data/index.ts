/**
 * Where the 0.97d assets live.
 *
 * `folder` is the period `Data/` tree the client fetches directly (interface
 * sprites, the logo, `Local/*.bmd`, gate.bmd, the weather leaves). It sits beside
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
    // Lorencia's only grass card is TileGrass01.OZT; Season 6 added these two.
    lacks: new Set(['world1/tilegrass02.ozt', 'world1/tilegrass03.ozt']),
    folder: season6Data.folder,
    folderPaths: [
      // The in-game HUD and windows are still Season 6's, so is their art
      // wherever the period Interface/ has no sheet of that name (readme.md).
      'interface/',
      // The minimap pictures of the worlds whose terrain is Season 6's.
      'world1/mini_map.ozt',
      'world2/mini_map.ozt',
      'world4/mini_map.ozt',
      'world5/mini_map.ozt',
      // The sign plates of 0.97d's maps: its own copies are Season 6's bytes.
      'object1/notice.ozj',
      'object3/snotice.ozj',
      'object3/snotice02.ozj',
      'object7/notice.ozj',
    ],
  },
  sounds: V097D_SOUNDS,
  // Its gate.bmd: 100 records of nine BYTEs (Flag, Map, x1, y1, x2, y2, Target,
  // Angle, Level); Season 6 widened Target and Level to WORDs and added MaxLevel.
  gates: {
    records: 100,
    size: 9,
    target: { at: 6, bytes: 1 },
    angle: { at: 7, bytes: 1 },
    level: { at: 8, bytes: 1 },
  },
};
