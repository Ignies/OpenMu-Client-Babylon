/**
 * TEMPLATE — copy this folder's shape for a new map: `maps/<name>/index.ts`
 * (this file's contents), `maps/<name>/spec.ts` (the per-type tables) and
 * `maps/<name>/create.ts` (the object classes and the setup function). Add
 * `<name>Layer` to `layers.ts`. Never imported; it only exists to be copied.
 *
 * Every entry has the same three parts, in this order:
 *
 *   1. Data at the top: worlds, tiles, spawn, sky kind — each with a comment
 *      saying where in the original it comes from.
 *   2. State + readers: a map entry has none of its own — its runtime state
 *      lives in the objects `create` binds (or in an event / sound entry).
 *   3. The exported `MapLayer` at the bottom.
 *
 * `create` MUST stay a dynamic import (see `layer.ts`): the object classes
 * extend `ModelObject`, whose imports read this system's tables.
 */
import { ENUM_WORLD } from '../common/types';
import type { MapLayer } from './layer';
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
