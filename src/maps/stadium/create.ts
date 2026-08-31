import type { World } from '../../ecs/world';
import { StadiumBrazierObject } from './brazierObject';

/**
 * Stadium (WD_6STADIUM, world 6 / `Object7`).
 *
 * The map is table data almost end to end — spec.ts holds the fountain's blend
 * mesh, the hidden marker and the brazier light, and common/meshAnimation.ts
 * holds the fountain's V scroll. One type needs a class, and it is wired here.
 *
 * The rest of Object7 is scenery the original never touches: 24/25 the two big
 * rigged statues (47 and 54 bones), 31-36 the trees and bushes, 12-19 the
 * fences, tents and banners, 37 the notice board, 21 the fountain. They load
 * and draw and do nothing else, which is correct.
 *
 * Deliberately not built:
 *
 *  - **Ground bugs.** `Object7/Bug01.glb`, max 3, silent, crawling the arena
 *    floor. Like Lost Tower's bats they are not map objects but a wandering
 *    creature the clone has no system for; a boid loop wedged into a map
 *    module would be the wrong home for it. Left as future work — the two maps
 *    want the same system.
 *
 *  - **Combat rules.** Auto-attack and auto-targeting are off in Stadium, the
 *    same rule Chaos Castle runs under, because it is a duel arena and a
 *    stray auto-swing decides the fight. That is combat work and belongs
 *    with the targeting code, not here.
 *
 *  - **Sound.** Stadium has no ambient bed and no music in the original — the
 *    silence is the arena's, not an omission. Music and ambience are wired
 *    centrally, so nothing is registered here on purpose.
 */
export async function createStadium(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  // Type 9 (n=32): the brazier, the world's only `RenderObjectVisual` case
  // (ZzzObject.cpp:2945-2953).
  tiles[9] = StadiumBrazierObject;
}
