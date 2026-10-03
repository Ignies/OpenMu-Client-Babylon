import { Entity, World } from '../../ecs/world';
import { getMaterial, loadGLTF } from '../assets/modelLoader';
import { ModelObject } from '../render/modelObject';
import { BlendState } from '@versions/shared/objects/enum';
import { SNOW_GROUND_MAPS } from '../weather/snowCover';
import { isEffectOnlyObject } from '../render/effectOnlyObjects';
import { ParticleEmitter, emissionsFor } from '../fx/effectParticles';

export class MapTileObject extends ModelObject {
  static Batchable = true;

  #emitter: ParticleEmitter | null = null;

  async init(world: World, entity: Entity) {
    await super.init(world, entity);

    if (isEffectOnlyObject(this.WorldIndex, this.Type)) {
      this.CastsShadow = false;
      this.Visible = false;
      this.Ready = true;

      const emissions = emissionsFor(this.WorldIndex, this.Type);

      if (emissions) {
        this.#emitter = new ParticleEmitter(
          world.scene,
          emissions,
          this.node.position,
          this.node.rotation.y,
          this.node.scaling.x
        );
      }

      return;
    }

    const dir = this.objectDir;
    const modelPath = `${dir}Object${(this.Type + 1)
      .toString()
      .padStart(2, '0')}.glb`;

    // Icarus 4/5 used to be remapped to `Object11/cloud.glb` here. That was a
    // misreading: Object01..Object06 are six byte-identical copies of one
    // 50-unit smoke box, and `RenderObjectVisual` hides all six on sight
    // (`o->HiddenMesh = -2`, ZzzObject.cpp:3052-3110) and replaces them with
    // BITMAP_CLOUD billboards. `cloud.bmd` is MODEL_CLOUD, an *effect* model
    // loaded by MapManager.cpp:151 and used only for the lightning flash
    // plane - never a map object. versions/shared/maps/icarus/cloudObject.ts owns all six now.
    // Before load: the metadata loop in ModelObject.load stamps every mesh.
    this.SnowCap = SNOW_GROUND_MAPS.has(this.WorldIndex);

    this.load(await loadGLTF(modelPath, world));

    if (modelPath === 'Object3/Object20.glb') {
      const m = this.getMesh(0)!;
      m.material = getMaterial(world.scene, false, 2, BlendState.ALPHA_ADD);
    }

    // The three `Object8/*` overrides that stood here are gone. They were
    // guesses at what the Atlans water plane (type 23), bubble vent (22) and
    // god-ray (38) should look like, made before the map had a table; all
    // three are now the original's own `o->BlendMesh` values in
    // maps/atlans/spec.ts, with the breathing `BlendMeshLight` sines from
    // ZzzObject.cpp:4014-4034 in atlans/spec.ts. Two were actively
    // wrong: type 22 is `HiddenMesh = -2` and never drawn at all, and the
    // material override on 23 ran *after* `applyBlendMesh` and would have
    // silently beaten the table entry.

    // Icarus used to force every mesh on the map additive here. It is not in
    // the reference and it is not needed: every Icarus map mesh is textured
    // `top02_R` or `gyg_R`, and the `_R` suffix already means bright/additive
    // through textureScript.ts - the one mesh family that is not (`test12_H`)
    // is `_H`, never drawn. The blanket added nothing the flags had not
    // already done, and took the decision away from them.
  }

  dispose(): void {
    this.#emitter = null;

    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    if (!this.Ready) return;

    this.#emitter?.update();

    // The `Object8/Object24.glb` sine that pulsed mesh *visibility* here was
    // the Atlans water plane's `BlendMeshLight` done as alpha - it dimmed the
    // whole mesh rather than the additive layer. ZzzObject.cpp:4016 is
    // `o->BlendMeshLight = sinf(WorldTime * 0.002f) * 0.3f + 0.5f`, which now
    // lives in atlans/spec.ts as the ATLANS_MESH_ANIMATIONS table's `light`.
  }
}
