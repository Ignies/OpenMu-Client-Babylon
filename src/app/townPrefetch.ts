import { ENUM_WORLD } from '@/core/types';

/** The towns and first hunting grounds whose terrain is fetched in the background once in the world. */
export const WARM_MAPS: readonly ENUM_WORLD[] = [
  ENUM_WORLD.WD_0LORENCIA,
  ENUM_WORLD.WD_2DEVIAS,
  ENUM_WORLD.WD_3NORIA,
  ENUM_WORLD.WD_51ELBELAND,
  ENUM_WORLD.WD_1DUNGEON,
  ENUM_WORLD.WD_4LOSTTOWER,
  ENUM_WORLD.WD_7ATLANSE,
  ENUM_WORLD.WD_8TARKAN,
];
/** After the first map is in, so the prefetch does not compete with its own staging. */
export const WARM_DELAY_MS = 3000;

/**
 * Ours (no visible change): the first time the hero is in the world, the other warm maps' terrain files
 * download in the background, so a later `/move` there finds them in memory (`prefetchWorld.ts` keeps
 * them until that map loads). Returns the `warpCompleted` handler boot installs.
 */
export function townPrefetch(
  inWorld: () => boolean,
  currentMap: () => ENUM_WORLD,
  prefetch: (map: ENUM_WORLD) => void
): () => void {
  let warmed = false;
  return () => {
    if (warmed || !inWorld()) return;
    warmed = true;
    setTimeout(() => {
      for (const map of WARM_MAPS) if (map !== currentMap()) prefetch(map);
    }, WARM_DELAY_MS);
  };
}
