import { Vector3 } from '../libs/babylon/exports';
import { HIDDEN_MESH_ALL, ModelObject } from './modelObject';

/**
 * `CreateObject`'s default pick box, `Vector(-40,-40,0)` … `Vector(40,40,80)`
 * (ZzzObject.cpp:4457-4494), in tile units and Babylon Y-up.
 */
const DEFAULT_BOX_HEIGHT = 0.8;

/** The `Vector(40.f, 40.f, 160.f, o->BoundingBoxMax)` override, same units. */
const LEAN_BOX_HEIGHT = 1.6;

const BOX_HALF = 0.4;

/**
 * `CreateOperate(o)` + `o->HiddenMesh = -2`: a click target with no visible
 * body.
 *
 * The original loads the model like any other object and simply never draws
 * it — `Draw_RenderObject` (ZzzObject.cpp:390) gates the whole body on
 * `HiddenMesh != -2`, so it is visible only in the map editor. Setting
 * `HiddenMesh` to `HIDDEN_MESH_ALL` reproduces that: the meshes load, leave
 * the render list, cast no shadow, and `UpdateBoundings` uses the fixed box
 * below rather than whatever the mesh happens to measure.
 *
 * Used by Noria 38, the healing spot, which keeps the default box height.
 */
export class OperateBoxObject extends ModelObject {
  async init() {
    this.HiddenMesh = HIDDEN_MESH_ALL;
    this.CastsShadow = false;

    const height = this.boxHeight();

    this.FixedBoundingBox = {
      min: new Vector3(-BOX_HALF, 0, -BOX_HALF),
      max: new Vector3(BOX_HALF, height, BOX_HALF),
    };

    // A missing model must not strand the trigger — the box is what the click
    // ray actually hits, so it stays live either way.
    try {
      await this.loadSpecificModel(this.modelName());
    } catch {
      this.Ready = true;
    }
  }

  /** File inside `objectDir`; the numbered default suits every map but Lorencia. */
  protected modelName(): string {
    return `Object${(this.Type + 1).toString().padStart(2, '0')}.glb`;
  }

  protected boxHeight(): number {
    return DEFAULT_BOX_HEIGHT;
  }
}

/**
 * The taller variant: `CreateOperate` + the explicit
 * `Vector(40.f, 40.f, 160.f, o->BoundingBoxMax)` + `HiddenMesh = -2`, which
 * the original uses for every "lean against me" pose trigger — Lorencia's
 * MODEL_POSE_BOX (ZzzObject.cpp:4585), Dungeon 60 (:4611), Devias 91 (:4652),
 * Atlans 39 and Market 67.
 *
 * The doubled height is the point: a knee-high box would never be under the
 * cursor when the player aims at a wall.
 */
export class LeanBoxObject extends OperateBoxObject {
  protected boxHeight(): number {
    return LEAN_BOX_HEIGHT;
  }
}
