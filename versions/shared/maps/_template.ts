/**
 * TEMPLATE - copy me for a new map entry; never imported. Steps in readme.md.
 * `create` MUST stay a dynamic import (see `layer.ts`).
 */
import { ENUM_WORLD } from '@/core/types';
import type { MapLayer } from '@/controllers/maps';
import { FULL_TILES } from './recipes';

// ---- 1. data ---------------------------------------------------------------

/** The world(s) this entry serves; every `ENUM_WORLD` value is in one entry. */
const WORLDS: readonly ENUM_WORLD[] = [ENUM_WORLD.WD_0LORENCIA];

/** OpenMU's spawn gate for the map (VersionSeasonSix/Gates.cs), in tiles. */
const SPAWN = { x: 128, y: 128 } as const;

// ---- 2. state + readers ----------------------------------------------------
// None: a map entry is data plus a one-off `create`.

// ---- 3. the layer ----------------------------------------------------------

export const templateLayer: MapLayer = {
  name: 'template',
  worlds: WORLDS,
  tiles: FULL_TILES,
  spawn: SPAWN,
  outdoor: true,
  // blendMeshes / effectOnly / emissions: the tables from `./spec`.
  // create: world => import('./create').then(m => m.createTemplate(world)),
};
