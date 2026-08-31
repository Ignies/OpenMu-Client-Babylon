import type { World } from '../../ecs/world';
import { PlaySpeedObject } from '../shared/objectVariants';

/**
 * Doppelganger 3 (`WD_67DOPPLEGANGER3`, `World68`/`Object68`) — the
 * underwater arena. Tables in `spec.ts`; 40's `Velocity = 0.05` (the
 * anemone, GMDoppelGanger3.cpp:89-93, ×0 placed) here. Music `null`
 * (event-gated). The Atlans fog mood would suit it — a row for the lighting
 * lane.
 */
export async function createDoppelganger3(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  tiles[40] = PlaySpeedObject.at(0.05);
}
