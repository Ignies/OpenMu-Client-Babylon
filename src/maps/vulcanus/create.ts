import type { World } from '../../ecs/world';
import { VulcanusLavaSprayObject } from './lavaSprayObject';
import { bindAbsentModels } from '../shared/objectVariants';
import {
  VulcanusMagmaFish2Object,
  VulcanusMagmaFishObject,
} from './magmaFishObject';

/**
 * Vulcanus / the PK Field (`WD_63PK_FIELD`, `World64`/`Object64`).
 *
 * `CGM_PK_Field` touches eleven object types in all. Seven of them (0-6) are
 * `CreateObject`'s unpickable vents (`CollisionRange = -300`, :237-241) that
 * `MoveObject` then hides (:252-262); four more (15, 16, 67, 68) are drawn
 * and only get extra passes. `spec.ts` carries the hidden markers, their
 * emissions, the vent lights and the four mesh rows. This file is the three
 * type bindings those tables cannot express.
 *
 * Every other type in EncTerrain64.obj - 17's 993 lava rocks, the cliffs,
 * the bridges, the columns - has no code behind it in the original and needs
 * none here.
 *
 * **Not built, and why:**
 *
 *  - **The Vulcanus monsters.** `CreateMonster` (:86-118), `MoveBlurEffect`
 *    (:120-229), `MoveMonsterVisual` (:517-607), `RenderMonsterVisual`
 *    (:609-803), `RenderMonster` (:805-963) and `PlayMonsterSound` (:995-1149)
 *    are the whole of the map's Zombie Fighters, Gladiators, Slaughterers,
 *    Blood Assassins and Lava Giants: weapon blurs, the assassins' severed
 *    head and body effect models, the giants' `LIGHTMARKS` joint glows and
 *    footprint decals. All of it hangs off `CHARACTER`, not off a map
 *    object, and belongs to the monster system rather than to a map folder.
 *  - **`CreateFireSpark`** (:965-993): `BITMAP_FIRE_SNUFF` embers seeded in a
 *    box around the hero and blown sideways - the leaves slot, i.e. a weather
 *    recipe.
 *  - **The additive grass.** `LoadWorld` binds `BITMAP_MAPGRASS` from
 *    `TileGrass01_R.jpg` here instead of the usual alpha-tested
 *    `TileGrass01.tga` (MapManager.cpp:1459), so Vulcanus' ground tufts are
 *    bright rather than cut out. Terrain work.
 *  - **`PlayObjectSound`** (:1151-1153) is empty: this map has no ambient
 *    bed. `PlayBGM` is `Music/PK_Field`.
 */
export async function createVulcanus(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  // GM_PK_Field.cpp:282-306, x10 - the windowed lava spray.
  tiles[0] = VulcanusLavaSprayObject;

  // GM_PK_Field.cpp:412-462 and :463-495, x1 each - the two magma fish.
  tiles[67] = VulcanusMagmaFishObject;
  tiles[68] = VulcanusMagmaFish2Object;

  // One record, and `Object64` has no `Object55.bmd` for it.
  bindAbsentModels(tiles, [54]);
}
