import { MapTileObject } from '../../common/mapTileObject';
import { Vector3 } from '../../libs/babylon/exports';
import type { Entity, World } from '../../ecs/world';

/**
 * `IntensityTransform[i][j] = 0.5f` over every normal of every mesh, then
 * `Vector(1.0f, 1.0f, 1.0f, o->Light)` (GM_Raklion.cpp:1062-1071). A
 * `RENDER_TEXTURE` pass is vertex lit by `BodyLight × IntensityTransform`,
 * so white × 0.5 is a flat mid grey on the whole body: these cliffs are cut
 * out of the terrain light entirely.
 *
 * Shared and never written to; `metadata.bodyLight` is only ever read.
 */
const FLAT_LIGHT = new Vector3(0.5, 0.5, 0.5);

/**
 * Raklion / hatchery types 6-12 (GM_Raklion.cpp:1057-1076) - `icesca01`…
 * `icesca07`, the ice scarps that wall the map in. ×121/×110/×2/×10/×17/
 * ×15/×10 on World58 and ×1/×2 on World59.
 *
 * The original's line is per-vertex, ours is per-mesh, and that is the whole
 * difference: `IntensityTransform` is flattened to one value for every
 * vertex before the draw, so a per-mesh constant reproduces it exactly.
 * Without it the cliffs take the terrain light under their own footprint -
 * one sample for a wall eight tiles tall - and a scarp standing on a dark
 * tile goes black from top to bottom.
 *
 * `metadata.bodyLight` rather than `Light`: `RenderSystem` overwrites
 * `modelObject.Light` from the terrain every frame, after `Update` and
 * before `Draw` (renderSystem.ts:75-82), so a value written from here could
 * never survive. Rebinding the metadata costs nothing per frame.
 */
export class RaklionIceScarpObject extends MapTileObject {
  /**
   * A batched type's meshes are built with `bodyLight: undefined` and take
   * their light per instance from `muInst`, the terrain light at the
   * placement (propBatches.ts:602-621) - which is the one thing this case
   * exists to throw away. 285 placements is a real cost to pay for it; the
   * cheaper answer is a per-type flat light `propBatches` could fold into
   * that write, and that is a shared file.
   */
  static Batchable = false;

  async init(world: World, entity: Entity): Promise<void> {
    await super.init(world, entity);

    for (const mesh of this.getMeshes(true)) {
      if (!mesh.metadata) continue;
      mesh.metadata.bodyLight = FLAT_LIGHT;
    }
  }
}
