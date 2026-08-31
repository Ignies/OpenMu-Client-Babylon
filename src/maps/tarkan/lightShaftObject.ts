import { MapTileObject } from '../../common/mapTileObject';
import { Vector3 } from '../../libs/babylon/exports';
import type { Entity, World } from '../../ecs/world';

/**
 * `Vector(1.0f, 1.0f, 1.0f, o->Light)` (ZzzObject.cpp:4126). Shared and never
 * written to: `metadata.bodyLight` is only ever read.
 */
const FULL_LIGHT = new Vector3(1, 1, 1);

/**
 * Tarkan 82 (ZzzObject.cpp:4123-4127), ×60 — the light shafts that fall
 * through the temple roofs and the canyon cracks, at scales 0.78 to 1.62 and
 * anywhere from 0.3 to 8 tiles above the sand.
 *
 * The blend mesh half is table data (`spec.ts`). The reason this is a class
 * is the second line of that case: the shaft is forced to full white
 * *regardless of the terrain light where it stands*.
 *
 * It is not a no-op in the port. `RenderMesh` draws a blend mesh with
 * `glColor3f(BodyLight * BlendMeshLight)` (ZzzBMD.cpp:1594) and
 * `bindBodyLight` does exactly the same multiply (itemMaterial.ts:285-297) —
 * so `o->Light` reaches the shaft either way. And `RenderSystem` overwrites
 * `modelObject.Light` every frame from the terrain light under the object
 * (renderSystem.ts:72-79), which for a shaft standing in a dark temple would
 * dim the one thing in the room that is supposed to be a light source.
 *
 * Rebinding the mesh's `bodyLight` metadata to a constant is the cheapest
 * faithful fix: `Light` keeps tracking the terrain for anything else that
 * reads it, and the drawn triangles see the white the C++ writes, with no
 * per-frame work at all. Overriding it from `Update` could not work — the
 * render system writes `Light` *after* every model's `Update` and before
 * `Draw`, so a value written here would always be the one that got replaced.
 */
export class TarkanLightShaftObject extends MapTileObject {
  async init(world: World, entity: Entity): Promise<void> {
    await super.init(world, entity);

    for (const mesh of this.getMeshes(true)) {
      if (!mesh.metadata) continue;
      mesh.metadata.bodyLight = FULL_LIGHT;
    }
  }
}
