import { ENUM_WORLD } from '../../core/types';
import { maps } from '../maps';

/**
 * Which `Data/World<n>` / `Data/Object<n>` folder a world draws from, and the
 * per-event world lists - the old names for what the map entries declare
 * (`MapLayer.worlds` / `MapLayer.assetWorld`, `versions/shared/maps/<name>/index.ts`).
 * Every export here is a thin reader over the `maps` facade, kept for the
 * callers that still use the old names; new code asks `maps` itself.
 *
 * Import order: nothing here reads `maps` at evaluation time. The lists are
 * live views that ask `maps.worldsOf` on first use, so this module may load
 * before the map entries do.
 */

/**
 * `CMapManager::LoadWorld` (MapManager.cpp:1206-1225) and `OpenObjects`
 * (MapManager.cpp:1103-1124): the event castles do not use `WorldActive + 1`
 * - every Blood Castle floor loads `World12`/`Object12`, every Chaos Castle
 * `World19`/`Object19`, every Kalima floor `World25`/`Object25`, every
 * Illusion Temple level `World47`/`Object47`, and Devil Square 5-7 (map 32)
 * folds into `World10`. Every other world is `n + 1`. Each entry declares
 * its own `assetWorld`; this is `maps.assetWorldNum`.
 */
export function assetWorldNum(map: ENUM_WORLD): number {
  return maps.assetWorldNum(map);
}

/**
 * A list of worlds read from the map entries on first use, not at load: an
 * array to every reader (index, `length`, `includes`, spread, `for...of`).
 */
function lazyWorlds(...names: string[]): readonly ENUM_WORLD[] {
  let list: readonly ENUM_WORLD[] | undefined;
  const real = (): readonly ENUM_WORLD[] =>
    (list ??= names.flatMap(name => maps.worldsOf(name)));
  return new Proxy([] as ENUM_WORLD[], {
    get: (_target, key) => {
      const r = real();
      const v: unknown = Reflect.get(r, key, r);
      return typeof v === 'function' ? v.bind(r) : v;
    },
    has: (_target, key) => Reflect.has(real(), key),
    ownKeys: () => Reflect.ownKeys(real()),
    getOwnPropertyDescriptor: (_target, key) =>
      Reflect.getOwnPropertyDescriptor(real(), key),
  });
}

/** Devil Square 1-4 (map 9) and 5-7 (map 32): one `World10`, one list. */
export const DEVIL_SQUARE_WORLDS: readonly ENUM_WORLD[] = lazyWorlds('devilsquare');

/** The seven Blood Castle floors and the master-level castle, one list. */
export const BLOOD_CASTLE_WORLDS: readonly ENUM_WORLD[] = lazyWorlds('bloodcastle');

/** The six Chaos Castle arenas and the master-level one. */
export const CHAOS_CASTLE_WORLDS: readonly ENUM_WORLD[] = lazyWorlds('chaoscastle');

/** The six Kalima floors and Kalima 7, one list. */
export const KALIMA_WORLDS: readonly ENUM_WORLD[] = lazyWorlds('kalima');

/** The six Illusion Temple levels. */
export const CURSED_TEMPLE_WORLDS: readonly ENUM_WORLD[] = lazyWorlds('cursedtemple');

/**
 * The four Fortress of Imperial Guardian days (`WD_69EMPIREGUARDIAN1 … 4`).
 * Unlike the castles each day has its own `World70…73` folder; days 1-3 and
 * day 4 are two entries (day 4's tables are the login scene's), so this list
 * is only for the registries whose rows are identical across the four.
 */
export const EMPIRE_GUARDIAN_WORLDS: readonly ENUM_WORLD[] = lazyWorlds(
  'empireguardian',
  'empireguardian4'
);

/** The four Doppelganger arenas (`WD_65DOPPLEGANGER1 … 4`), `World66…69`. */
export const DOPPELGANGER_WORLDS: readonly ENUM_WORLD[] = lazyWorlds(
  'doppelganger1',
  'doppelganger2',
  'doppelganger3',
  'doppelganger4'
);
