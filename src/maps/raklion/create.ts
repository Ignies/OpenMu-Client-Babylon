import type { World } from '../../ecs/world';
import { RaklionAuroraObject } from './auroraObject';
import { RaklionIceScarpObject } from './iceScarpObject';
import { RaklionPenguinBigObject, RaklionPenguinObject } from './penguinObject';
import { createRaklionWarpGate } from './warpGateObject';
import { bindAbsentModels } from '../shared/objectVariants';

/**
 * Raklion (`WD_57ICECITY`, `World58`/`Object58`) - the ice field. 1474
 * objects of 70 types.
 *
 * `CGM_Raklion` is shared with the hatchery: every hook gates on
 * `IsIceCity()` (GM_Raklion.cpp:2294-2306), so `maps/raklionboss` binds the
 * same classes for the types it places. The tables are `spec.ts`
 * (blend meshes, the two braziers) and `common/meshAnimation.ts` (the
 * `BlendMeshLight` sines on 22 and 68/69/71).
 *
 * Types with a case in the C++ and a class here:
 *
 *  - **6-12** (×121/×110/×2/×10/×17/×15/×10), :1057-1076 - the ice scarps,
 *    drawn at a flat grey with the terrain light cut out.
 *  - **16** (×11) :1077-1088 and **17** (×2) :1089-1123 - the penguins and
 *    their idle-clip lotteries, at the `Actions[].PlaySpeed` rates
 *    `LoadWorld` writes for this world alone (MapManager.cpp:1153-1163).
 *  - **76** (×43), :1308-1313 + :2245-2254 - the aurora and its drifting
 *    colour.
 *
 * **Not built, deliberately:**
 *
 *  - **19** (×2), **20** (×3), **21** (×8), :1124-1307 - `killerwhale`,
 *    `killerwhalePG` and `killerwhaleICE`, the orcas frozen into the ice.
 *    Each case is a burst of `BITMAP_WATERFALL_2/3/5` particles off named
 *    bones, gated by `o->CurrentAction` flipping 0 → 1 at the end of the
 *    burst and 1-in-40 back again. All three BMDs hold exactly one action,
 *    so that flip animates nothing - it is a state flag for the particles
 *    and nothing else. The particles are the whole effect and their kinds
 *    (`BITMAP_WATERFALL_2` SubType 5, `WATERFALL_3` SubType 8/9/13,
 *    `WATERFALL_5` SubType 7) are not in `common/effectParticles.ts`; only
 *    `waterfall5_9` is. Adding four kinds is a shared-file change, so the
 *    three are left as plain props and the omission is reported.
 *  - **30/31** (×6/×4), ZzzObject.cpp:3351 and :3391 - `choship_01/02`, the
 *    frozen ships, are rendered through a `TestFrustrum2D(…, -600.f)` branch
 *    that skips the per-block visibility gate. That is the original widening
 *    its coarse 16×16-block cull for two objects far taller than a block;
 *    Babylon frustum-culls per mesh and `CalculateVisibilitySystem` works off
 *    a tile radius, so there is nothing to widen.
 *  - **46** (×26) and **53** (×14), :1308-1313 + :2240-2244 - the
 *    `BossSpider01/02` webs. The case sets `m_bRenderAfterCharacter` and
 *    draws them again after the characters; see the note in
 *    `auroraObject.ts` for why the port keeps them in the object pass.
 *  - **57** (×6), :1314-1327 - `Bossgate02`. The case transforms bone 1 and
 *    then does nothing with it: the `CreateEffect(BITMAP_GATHERING, …)` that
 *    used the position is commented out, and the `RenderBody` that follows is
 *    the default draw.
 *  - **82** (×1), :1390-1402 - `Ice_Boss_Gate`, frozen at frame 0 while
 *    `m_bCanGoBossMap` is false. That flag only moves on a server state
 *    packet (`SetState`, :2747-2781) and starts true.
 *  - **247** (×65) - not a map object; see `spec.ts`. Left as it is: the
 *    records ask for `Object58/Object248.glb`, which does not exist, and the
 *    loads fail and are logged, the same way Tarkan's three orphan records
 *    do. The clean fix is one guard in `createObjects` for every type at or
 *    above `MAX_WORLD_OBJECTS` (160) - World58, World59 and World66 all
 *    carry these - and that is a shared file.
 *  - **`RenderBaseSmoke`** (:2282-2292) - two full-screen scrolling layers,
 *    `sand02` at 3×2 and `Map_Smoke1` at 0.3×0.3, drawn over everything by
 *    `ZzzInterface.cpp:3657`. The blizzard haze is the map's loudest single
 *    feature and it is a screen-space pass, not an object - the same call the
 *    Swamp of Quiet and Tarkan ports leave out.
 *  - **The Selupan fight** - `MoveEffect` (:2797-2832) and `CreateMapEffect`
 *    (:2834-2925), the falling ice and the earthquake that announce the boss,
 *    run only while `m_byState` has been moved by a server packet. Likewise
 *    `CreateMonster`, `MoveMonsterVisual`, `RenderMonster*`,
 *    `SetCurrentActionMonster` and `PlayMonsterSound`: monster work, not map
 *    objects.
 *  - **`CreateSnow`** (:2257-2280) - the leaves-slot blizzard; see
 *    `index.ts`.
 */
export async function createRaklion(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  // GM_Raklion.cpp:1057-1076.
  for (let type = 6; type <= 12; type++) {
    tiles[type] = RaklionIceScarpObject;
  }

  // GM_Raklion.cpp:1077-1088 and :1089-1123.
  tiles[16] = RaklionPenguinObject;
  tiles[17] = RaklionPenguinBigObject;

  // GM_Raklion.cpp:2245-2254.
  tiles[76] = RaklionAuroraObject;

  // 65 stacked records at tile (162, 83) - a map editor writing the client's
  // own runtime `MODEL_WARP` back into the `.obj`, once per save. Past
  // `MAX_WORLD_OBJECTS`, so no folder slot ever held a model for it.
  bindAbsentModels(tiles, [247]);

  // MapManager.cpp:760-764: the gate to the hatchery, at the north edge.
  createRaklionWarpGate(world, 171, 24, 80);
}
