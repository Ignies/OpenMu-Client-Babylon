import { OperateBoxObject } from '../../common/operateBoxObject';
import { toRadians } from '../../common/utils';
import type { World } from '../../ecs/world';
import { Vector3 } from '../../libs/babylon/exports';
import type { ModelObject } from '../../common/modelObject';
import {
  NoriaWarpHalo2Object,
  NoriaWarpHalo3Object,
  NoriaWarpHaloObject,
  warpRingScale,
} from './warpGateObject';

/**
 * Noria (WD_3NORIA, World4 / Object4).
 *
 * Almost all of this map is data: the blend meshes, the lamp sprites and the
 * forge live in `spec.ts` and reach the engine through the shared registries,
 * and the UV scrolls for 18/41/42/43 are already in `meshAnimation.ts`. What
 * is left here is the one operate box and the warp gate, which the original
 * builds from `MapManager` rather than from EncTerrain4.obj.
 *
 * Deliberately not built (all verified against the reference, not assumed):
 *  - Types 11-16 and 22/23/26/27/34/36 are the animated grass, flowers and
 *    trees. Their sway is a BMD bone animation the converter already baked
 *    into the GLB clips, so `MapTileObject` plays it with no help.
 *  - Type 24 (the 6x6x7 big tree), 30 (the wooden bridge) and 31-33 (rocks)
 *    have no case in `CreateObject`, `MoveObject` or `RenderObjectVisual` —
 *    they are plain props.
 *  - The water tiles are terrain layer 5 on the generic scroll; Noria adds no
 *    terrain code of its own.
 *  - `Music/Noria`, the `Sound/aWind` bed and the 1-in-512 `Sound/aForest`
 *    one-shot are already wired in sound/music.ts / sound/ambientBeds.ts.
 *  - Falling leaves are already Noria's: `LEAF_MAPS` in
 *    ambientParticleSystem.ts lists WD_3NORIA next to Lorencia and Atlans.
 *  - The 40 butterflies (`Object1/Butterfly01`, MapManager.cpp:88) need a
 *    boid flock the clone has no equivalent of. Future work, not faked.
 *  - The sit spot (type 8) and the healing spot (type 38) are already routed:
 *    `restObjects.ts` maps them to sit/healing and `cursorSystem` picks the
 *    rest cursor off `findRestObject`, so type 38 needs only its box below.
 */
export async function createNoria(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  /**
   * Noria 38: `CreateOperate(o)` + `o->HiddenMesh = -2` (ZzzObject.cpp:4703),
   * and — unlike every other operate box in the game — with no
   * `BoundingBoxMax` override anywhere in the Noria block, so it keeps
   * `CreateObject`'s default `(40, 40, 80)`. That is `OperateBoxObject`, not
   * `LeanBoxObject`: the taller (40, 40, 160) variant belongs to the
   * lean-on-a-wall poses, and this is the healing spot you sit down on.
   */
  tiles[38] = OperateBoxObject;

  createWarpGate(world);
}

/**
 * `MapManager.cpp:100-103`, the Noria arm of the warp-gate block: one gate at
 * tile (223, 30), angle `(0, 0, 10)`, from `Data/Npc/warp01..03.bmd` — all
 * three are staged as `NPC/warp0N.glb`.
 *
 * `CreateObject` (ZzzObject.cpp:4675-4693) turns that single record into five
 * stacked effects at `z + 350`, offset along Y by 0, 4, 8, 12 and 20, in the
 * order warp01, warp02, warp01, warp02, warp03. The base object is skipped —
 * see the note in warpGateObject.ts: the original leaves its Z at 0 and buries
 * it under 1.80 tiles of terrain.
 */
function createWarpGate(world: World): void {
  /** `Pos[0] = 223 * TERRAIN_SCALE; Pos[1] = 30 * TERRAIN_SCALE;` */
  const tileX = 223;
  const tileY = 30;

  /** `Position[2] + 350.f`, in tiles. The gate floats; no terrain lookup. */
  const height = 3.5;

  /** `Vector(0.f, 0.f, 10.f, Ang)` — `Angle[2]` is the MU yaw. */
  const yaw = toRadians(10);

  const stack: {
    factory: typeof ModelObject;
    offsetY: number;
    scale: number;
  }[] = [
    { factory: NoriaWarpHaloObject, offsetY: 0, scale: warpRingScale() },
    { factory: NoriaWarpHalo2Object, offsetY: 4, scale: warpRingScale() },
    { factory: NoriaWarpHaloObject, offsetY: 8, scale: warpRingScale() },
    { factory: NoriaWarpHalo2Object, offsetY: 12, scale: warpRingScale() },
    // `o->Scale = 0.6f` for MODEL_WARP3 (ZzzEffect.cpp:556).
    { factory: NoriaWarpHalo3Object, offsetY: 20, scale: 0.6 },
  ];

  for (const { factory, offsetY, scale } of stack) {
    world.add({
      worldIndex: world.mapIndex,
      transform: {
        // The Y offsets are in MU units, so 4…20 is 0.04…0.20 of a tile —
        // the copies are meant to sit almost inside one another and beat
        // against each other as they spin at different rates.
        pos: new Vector3(tileX, height, tileY + offsetY / world.terrainScale),
        // Matches what createObjects builds for a map record: MU-positive yaw
        // in `rot.y`, flipped once by `toRenderAngles`.
        rot: new Vector3(0, yaw, 0),
        scale,
      },
      modelFactory: factory,
      visibility: {
        state: 'hidden',
        lastChecked: 0,
      },
    });
  }
}

