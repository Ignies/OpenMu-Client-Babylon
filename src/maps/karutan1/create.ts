import type { World } from '../../ecs/world';
import { PlaySpeedObject } from '../shared/objectVariants';
import { KarutanInsectObject } from './insectObject';

/**
 * Karutan 1 (`WD_80KARUTAN1`, `World81`/`Object81`) - the desert.
 *
 * `CGMKarutan1` has no `CreateObject` (GMKarutan1.cpp:31-34, `return
 * false`), so the per-object settings this binds are the two the loader
 * writes outside it: `Models[66].Actions[0/1].PlaySpeed = 0.15f` and
 * `Models[107].Actions[0].PlaySpeed = 5.f` (MapManager.cpp:1164-1172), which
 * reach the object because `RenderObject` swaps `o->Velocity` for the
 * action's `PlaySpeed` on exactly these two types
 * (ZzzObject.cpp:3696-3701). Everything else the map does is table data:
 * `spec.ts` (the hidden vents, the fire light, the bone sprites, the
 * `RenderAfterObjectMesh` sines and scrolls) and `sound/objectLoops.ts`.
 *
 *  - **66** (×6): 0.15, plus the tail-of-clip action roll - `insectObject.ts`.
 *  - **107** (×17): 5.0 - `flag.SMD`, the Kardamahal banner, 31 times the
 *    default 0.16: the cloth snaps rather than stirs.
 *
 * Not built:
 *  - The `o->m_bRenderAfterCharacter = true` on 1, 3, 54, 55, 56, 57, 58, 62,
 *    63, 66 and 119 (:170-188) - see `KARUTAN_MESH_ANIMATION`.
 *  - The bone-anchored sprite pairs on 66 (bones 13/14) and 72 (bones 11/7,
 *    :83-99), each reduced to one flare in `KARUTAN_LIGHTS`.
 *  - The map's two new particle SubTypes - `BITMAP_WATERFALL_3` 16
 *    (ZzzEffectParticle.cpp:3624-3632, :8667-8686) on 114 and `BITMAP_SMOKE`
 *    69 (:1654-1661, :5880-5888) on 116 - stand in as the nearest existing
 *    `effectParticles` kinds; adding a kind is that file's business.
 *  - `IsKarutanMap()`'s second grass-wind field (ZzzLodTerrain.cpp:74-76,
 *    :2656-2684: a 15-unit sine at 0.008 laid over the usual 10 at 0.01) and
 *    the scrolling sand overlay drawn over the whole screen
 *    (ZzzInterface.cpp:3633-3642). Terrain and UI, not objects.
 *
 * Bed `Karutan_desert_env`, object loop `Karutan_insect_env` on 58 and 66,
 * music `Music/Karutan_A`.
 */
export async function createKarutan1(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  tiles[66] = KarutanInsectObject;
  tiles[107] = PlaySpeedObject.at(5);
}
