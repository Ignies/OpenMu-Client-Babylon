import { ENUM_WORLD } from './types';
import { maps } from '../maps';

/**
 * Which `Data/World<n>` / `Data/Object<n>` folder a world draws from, and the
 * per-event world lists — the old names for what the map entries declare
 * (`MapLayer.worlds` / `MapLayer.assetWorld`, `src/maps/<name>/index.ts`).
 * Every export here is a thin reader over the `maps` facade, kept so
 * `modelObject`, the terrain loaders, the sound tables and the lighting
 * tables compile unchanged.
 *
 * Import order: this module reads `maps` at evaluation time (the lists
 * below), so nothing on the `maps` import chain may import it. The entries
 * are data-only (their `create` is a dynamic import), which keeps that true.
 */

/**
 * `CMapManager::LoadWorld` (MapManager.cpp:1206-1225) and `OpenObjects`
 * (MapManager.cpp:1103-1124): the event castles do not use `WorldActive + 1`
 * — every Blood Castle floor loads `World12`/`Object12`, every Chaos Castle
 * `World19`/`Object19`, every Kalima floor `World25`/`Object25`, every
 * Illusion Temple level `World47`/`Object47`, and Devil Square 5-7 (map 32)
 * folds into `World10`. Every other world is `n + 1`. Each entry declares
 * its own `assetWorld`; this is `maps.assetWorldNum`.
 */
export function assetWorldNum(map: ENUM_WORLD): number {
  return maps.assetWorldNum(map);
}

/** Devil Square 1-4 (map 9) and 5-7 (map 32): one `World10`, one list. */
export const DEVIL_SQUARE_WORLDS: readonly ENUM_WORLD[] =
  maps.worldsOf('devilsquare');

/** The seven Blood Castle floors and the master-level castle, one list. */
export const BLOOD_CASTLE_WORLDS: readonly ENUM_WORLD[] =
  maps.worldsOf('bloodcastle');

/** The six Chaos Castle arenas and the master-level one. */
export const CHAOS_CASTLE_WORLDS: readonly ENUM_WORLD[] =
  maps.worldsOf('chaoscastle');

/** The six Kalima floors and Kalima 7, one list. */
export const KALIMA_WORLDS: readonly ENUM_WORLD[] = maps.worldsOf('kalima');

/** The six Illusion Temple levels. */
export const CURSED_TEMPLE_WORLDS: readonly ENUM_WORLD[] =
  maps.worldsOf('cursedtemple');

/**
 * The four Fortress of Imperial Guardian days (`WD_69EMPIREGUARDIAN1 … 4`).
 * Unlike the castles each day has its own `World70…73` folder; days 1-3 and
 * day 4 are two entries (day 4's tables are the login scene's), so this list
 * is only for the registries whose rows are identical across the four.
 */
export const EMPIRE_GUARDIAN_WORLDS: readonly ENUM_WORLD[] = [
  ...maps.worldsOf('empireguardian'),
  ...maps.worldsOf('empireguardian4'),
];

/** The four Doppelganger arenas (`WD_65DOPPLEGANGER1 … 4`), `World66…69`. */
export const DOPPELGANGER_WORLDS: readonly ENUM_WORLD[] = [
  ...maps.worldsOf('doppelganger1'),
  ...maps.worldsOf('doppelganger2'),
  ...maps.worldsOf('doppelganger3'),
  ...maps.worldsOf('doppelganger4'),
];

/**
 * The same table row for every world in a list — what a per-world table
 * (`BEDS`, `MAP_MUSIC`, the lighting tables) spreads in for an event whose
 * instances share one art set.
 */
export function onWorlds<T>(
  worlds: readonly ENUM_WORLD[],
  value: T
): Partial<Record<ENUM_WORLD, T>> {
  const out: Partial<Record<ENUM_WORLD, T>> = {};
  for (const w of worlds) out[w] = value;
  return out;
}
