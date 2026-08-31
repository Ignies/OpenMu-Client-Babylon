import { Entity, World } from '../ecs/world';
import { getMaterial, loadGLTF } from './modelLoader';
import { ModelObject } from './modelObject';
import { BlendState } from './objects/enum';
import { ENUM_WORLD } from './types';
import { SNOW_MAPS } from '../weather/ambientWeather';
import { isEffectOnlyObject } from './effectOnlyObjects';
import { createEffectLight, type EffectLight } from './effectLights';
import {
  LOGIN_CHANDELIER,
  LOGIN_WALL_TORCH,
  lightMapObject,
} from '../lighting/mapObjectLights';
import type { LightSource } from '../lighting/lightSource';
import {
  BonedParticleEmitter,
  ParticleEmitter,
  emissionsFor,
  type BonedEmission,
} from './effectParticles';

export class MapTileObject extends ModelObject {
  #light: EffectLight | null = null;

  #emitter: ParticleEmitter | null = null;

  #boneEmitter: BonedParticleEmitter | null = null;

  /** The light, when this type has one (login chandelier / wall torch). */
  #source: LightSource | null = null;

  #disposed = false;

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
    // plane — never a map object. maps/icarus/cloudObject.ts owns all six now.
    // Before load: the metadata loop in ModelObject.load stamps every mesh.
    this.SnowCap = SNOW_MAPS.has(this.WorldIndex);

    this.load(await loadGLTF(modelPath, world));

    if (
      this.Type === 157 &&
      this.WorldIndex === ENUM_WORLD.WD_73NEW_LOGIN_SCENE
    ) {
      this.#boneEmitter = this.#createChandelierFire(world);
    }

    if (
      this.WorldIndex === ENUM_WORLD.WD_73NEW_LOGIN_SCENE &&
      this.Type === 37
    ) {
      this.#createWallTorch(world);
    }

    if (modelPath === 'Object3/Object20.glb') {
      const m = this.getMesh(0)!;
      m.material = getMaterial(world.scene, false, 2, BlendState.ALPHA_ADD);
    }

    // The three `Object8/*` overrides that stood here are gone. They were
    // guesses at what the Atlans water plane (type 23), bubble vent (22) and
    // god-ray (38) should look like, made before the map had a table; all
    // three are now the original's own `o->BlendMesh` values in
    // maps/atlans/spec.ts, with the breathing `BlendMeshLight` sines from
    // ZzzObject.cpp:4014-4034 in common/meshAnimation.ts. Two were actively
    // wrong: type 22 is `HiddenMesh = -2` and never drawn at all, and the
    // material override on 23 ran *after* `applyBlendMesh` and would have
    // silently beaten the table entry.

    // Icarus used to force every mesh on the map additive here. It is not in
    // the reference and it is not needed: every Icarus map mesh is textured
    // `top02_R` or `gyg_R`, and the `_R` suffix already means bright/additive
    // through textureScript.ts — the one mesh family that is not (`test12_H`)
    // is `_H`, never drawn. The blanket added nothing the flags had not
    // already done, and took the decision away from them.
  }

  #createChandelierFire(world: World): BonedParticleEmitter | null {
    const root = this.gltf?.mesh;

    if (!root) return null;

    const nodeByBone = new Map<number, BonedEmission['node']>();

    for (const node of root.getDescendants(false)) {
      const match = /^bone_(\d+)_/.exec(node.name);

      if (match && 'getAbsolutePosition' in node) {
        nodeByBone.set(Number(match[1]), node as BonedEmission['node']);
      }
    }

    const scale = this.node.scaling.x;
    const points: BonedEmission[] = [];

    for (const bone of [22, 23, 25]) {
      const node = nodeByBone.get(bone);
      if (!node) continue;

      points.push(
        { node, kinds: ['fire157'], count: 2, scale: scale * 0.2, light: [0.9, 0.5, 0] },
        { node, kinds: ['fire157'], count: 2, scale: scale * 0.1, light: [0.75, 0.3, 0] }
      );
    }

    for (const bone of [26, 24, 21]) {
      const node = nodeByBone.get(bone);
      if (!node) continue;

      points.push({
        node,
        kinds: ['smoke65'],
        count: 1,
        scale: scale * 0.1,
        light: [1, 1, 1],
      });
    }

    if (!points.length) return null;

    this.#source = lightMapObject(
      world.scene,
      LOGIN_CHANDELIER,
      this.node.position
    );

    return new BonedParticleEmitter(world.scene, points);
  }

  #createWallTorch(world: World): void {
    const scale = this.node.scaling.x;

    const bone = this.gltf?.mesh
      .getDescendants(false)
      .find(n => n.name.startsWith('bone_1_'));

    const anchor: BonedEmission['node'] =
      bone && 'getAbsolutePosition' in bone
        ? (bone as unknown as BonedEmission['node'])
        : this.node;

    const position = anchor.getAbsolutePosition();
    const offsetY = 0;

    const spritePosition = {
      x: position.x,
      y: position.y + offsetY,
      z: position.z,
    };

    void createEffectLight(
      world.scene,
      LOGIN_WALL_TORCH.sprite!,
      spritePosition,
      scale
    ).then(light => {
      this.#light = light;

      if (this.#disposed) {
        this.#light?.dispose();
        this.#light = null;
      }
    });

    this.#source = lightMapObject(world.scene, LOGIN_WALL_TORCH, spritePosition);

    this.#boneEmitter = new BonedParticleEmitter(world.scene, [
      {
        node: anchor,
        kinds: ['fire1', 'fire2', 'fire3'],
        count: 1,
        scale: scale * 0.8,
        light: [1, 1, 1],
        offsetY,
      },
    ]);
  }

  dispose(): void {
    this.#disposed = true;
    this.#light?.dispose();
    this.#light = null;

    this.#source?.dispose();
    this.#source = null;

    this.#emitter = null;
    this.#boneEmitter = null;

    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    if (!this.Ready) return;

    this.#emitter?.update();
    this.#boneEmitter?.update();

    // The `Object8/Object24.glb` sine that pulsed mesh *visibility* here was
    // the Atlans water plane's `BlendMeshLight` done as alpha — it dimmed the
    // whole mesh rather than the additive layer. ZzzObject.cpp:4016 is
    // `o->BlendMeshLight = sinf(WorldTime * 0.002f) * 0.3f + 0.5f`, which now
    // lives in common/meshAnimation.ts as the ATLANS table's `light`.
  }
}
