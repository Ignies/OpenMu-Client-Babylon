import type { World } from '../../ecs/world';
import { AlphaObject, PlaySpeedObject } from '../shared/objectVariants';

/**
 * Doppelganger 4 (`WD_68DOPPLEGANGER4`, `World69`/`Object69`) — the ruins
 * arena. Kanturu 1st's tables via `spec.ts` and the same per-object
 * settings (GMDoppelGanger4.cpp:85-133); of them only 44 (×0), 46 (×0), 76
 * (×0), 90 (×0), 96 (×0) — none placed, kept for parity. Music `null`
 * (event-gated).
 */
export async function createDoppelganger4(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  tiles[44] = PlaySpeedObject.at(0.02);
  tiles[46] = PlaySpeedObject.at(0.01);
  tiles[90] = PlaySpeedObject.at(0.04);
  tiles[76] = AlphaObject.at(0.5);
  tiles[96] = AlphaObject.at(0.5);
}
