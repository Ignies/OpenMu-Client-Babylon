import type { World } from '../../ecs/world';
import { AlphaObject, PlaySpeedObject } from '../shared/objectVariants';

/**
 * Aida (`WD_33AIDA`, `World34`/`Object34`) — the misty forest between Loren
 * and Crywolf.
 *
 * `MoveAidaObject` (GMAida.cpp:38-95) is the whole runtime: the UV scrolls
 * (`meshAnimation.ts`), the two glow lights and the eight hidden markers
 * (`spec.ts`), and two per-object settings that need a class:
 *
 *  - **41** (×21): `pObject->Alpha = 0.5f` — a translucent veil.
 *  - **64** (×65): `pObject->Velocity = 0.05f` — the hanging moss, played at
 *    a third of the default 0.16.
 *
 * Not built: the bone-anchored spark pairs on 30/71 (reduced to one flare in
 * `spec.ts`), the 65/66/77/78 explicit `RenderMesh` passes (:283-320, an
 * extra unlit draw of mesh 0 with a U scroll — the scroll is kept, the extra
 * pass is materials work), the butterflies on 60, and `M33Aida::CreateMist`
 * (the leaves slot — a weather recipe). `SOUND_AIDA_AMBIENT` is
 * `PlayBuffer`ed from `MoveAidaObject` every frame, i.e. a bed
 * (`ambientBeds.ts`); music `Music/Aida`.
 */
export async function createAida(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  // GMAida.cpp:70-73.
  tiles[41] = AlphaObject.at(0.5);
  // GMAida.cpp:87-89.
  tiles[64] = PlaySpeedObject.at(0.05);
}
