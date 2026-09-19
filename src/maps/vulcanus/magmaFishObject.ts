import {
  BonedParticleEmitter,
  type BonedEmission,
} from '../../common/effectParticles';
import { createMovableFlare, type MovableFlare } from '../../common/effectLights';
import { MapTileObject } from '../../common/mapTileObject';
import type { TransformNode } from '../../libs/babylon/exports';
import type { Entity, World } from '../../ecs/world';

/**
 * `Vector(1.0f, 0.0f, 0.0f, vLightFire); CreateSprite(BITMAP_LIGHT, Position,
 * o->Scale * 5.0f, vLightFire, o);` (GM_PK_Field.cpp:427-432, :479-484) -
 * twice, at bone 6 and at bone 6 translated `(0, 0, -350)` in bone space.
 *
 * Object68/Object69 carry two `Eye_effect01` bones, 5 and 6, and a
 * `Mouth_effect01` at 4. 350 MU is 3.5 tiles, the width of this head, and
 * the port has no primitive for a bone-local translation - so the second
 * flare hangs off bone 5, the head's other eye, which is where a symmetric
 * rig puts that offset. Two red eyes in the dark is the whole point of the
 * pair.
 */
const EYE_BONES = ['bone_5_', 'bone_6_'];
const EYE_FLARE_SCALE = 5;
const EYE_COLOR: readonly [number, number, number] = [1, 0, 0];

/** `b->TransformPosition(BoneTransform[4], p, Pos, false)` (:457, :490). */
const MOUTH_BONE = 'bone_4_';

/** One fish's breath: the window in BMD keys and what it exhales. */
type Breath = {
  readonly from: number;
  readonly to: number;
  readonly emission: Omit<BonedEmission, 'node' | 'scale'> & {
    readonly scale: number;
  };
};

/**
 * Type 67 (:434-459). `CreateParticleFpsChecked(BITMAP_SMOKE, Pos, o->Angle,
 * (0.4, 0.1, 0.1), 63, o->Scale * 1.5f)` while `AnimationFrame` is in
 * `[35, 50)`.
 *
 * SubType 63 swaps its own texture to `BITMAP_CLUD64` and lives 10 ticks
 * (ZzzEffectParticle.cpp:1581-1588). `wingCloud` is the port's only `clud64`
 * kind and lives 8, so this is a close match for once - it takes the tint
 * and rotates where the original drifts up and forward.
 */
const BREATH_67: Breath = {
  from: 35,
  to: 50,
  emission: {
    kinds: ['wingCloud'],
    count: 1,
    scale: 1.5,
    light: [0.4, 0.1, 0.1],
  },
};

/**
 * Type 68 (:486-492): the same call at SubType 18 and `(0.3, 0.1, 0.1)`,
 * while `AnimationFrame` is in `[7, 13)`. SubType 18 is a plain 20-tick
 * smoke puff (:1244-1249); `smoke22` is the reddish one and the closest
 * available, at three times the life.
 *
 * The original jitters the mouth point by `Random::RangeFloat(-30, -11)` in
 * X and Y before transforming it (:489) - a handful of MU, below the size of
 * the puff itself, and `BonedEmission` has no jitter field. Dropped.
 */
const BREATH_68: Breath = {
  from: 7,
  to: 13,
  emission: {
    kinds: ['smoke22'],
    count: 1,
    scale: 1.5,
    light: [0.3, 0.1, 0.1],
  },
};

function findBone(root: TransformNode, prefix: string): TransformNode | null {
  const node = root
    .getDescendants(false)
    .find(n => n.name.startsWith(prefix));

  return node && 'getAbsolutePosition' in node ? (node as TransformNode) : null;
}

/**
 * The two magma fish of Vulcanus, `RenderObjectMesh` :412-495 - type 67
 * (`Object68.glb`, x1, at 155.5/59.5) and type 68 (`Object69.glb`, x1).
 *
 * The UV scroll both cases do (`StreamMesh = 1` on `MagmaFish02`) is a
 * `meshAnimation` row in `spec.ts`. What is left, and what this class is,
 * are the two red eye flares and the breath.
 *
 * **Not ported.** Both cases also draw mesh 0 a second time as
 * `RENDER_BRIGHT | RENDER_CHROME` at alpha 0.2 with `BodyLight` forced to
 * `(1, 0, 0)` (:421, :473) - a red chrome rim. The port has no per-object
 * chrome pass and `BrightMesh` carries neither the tint nor the 0.2, so it
 * would read as a blown-out white clone rather than a red sheen; the same
 * note already stands on Tarkan 81 and Lost Tower 3/4.
 *
 * Type 67's idle gate is dropped too (:434-452): the original pins the clip
 * at `AnimationFrame = 1` and rolls `Random::RangeInt(0, 999) < 2` every
 * frame to let it run on through, so the fish is mostly still and lunges
 * about once a minute. `o->PKKey` is the flag it parks that state in.
 * Holding and releasing a looping clip from a map object is a
 * `ModelObject` facility that does not exist, and the fish is one object.
 */
abstract class MagmaFishObject extends MapTileObject {
  /**
   * One object each, and each holds two flares and a bone emitter of its
   * own; there is nothing here for `propBatches` to share.
   */
  static Batchable = false;

  #flares: MovableFlare[] = [];

  #bones: TransformNode[] = [];

  #breath: BonedParticleEmitter | null = null;

  #disposed = false;

  protected abstract breath(): Breath;

  async init(world: World, entity: Entity): Promise<void> {
    await super.init(world, entity);

    const root = this.gltf?.mesh;
    if (!root) return;

    const scale = this.node.scaling.x;

    for (const prefix of EYE_BONES) {
      const bone = findBone(root, prefix);
      if (!bone) continue;

      const flare = await createMovableFlare(
        world.scene,
        EYE_FLARE_SCALE * scale,
        EYE_COLOR
      );

      if (!flare) continue;

      if (this.#disposed) {
        flare.dispose();
        return;
      }

      this.#bones.push(bone);
      this.#flares.push(flare);
    }

    const mouth = findBone(root, MOUTH_BONE);

    if (mouth) {
      const { emission } = this.breath();

      this.#breath = new BonedParticleEmitter(world.scene, [
        { ...emission, node: mouth, scale: emission.scale * scale },
      ]);
    }
  }

  dispose(): void {
    this.#disposed = true;

    for (const flare of this.#flares) flare.dispose();

    this.#flares = [];
    this.#bones = [];
    this.#breath = null;

    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    if (!this.Ready) return;

    for (let i = 0; i < this.#flares.length; i++) {
      const bone = this.#bones[i];

      // The head swims on the clip; without the forced recompute the eyes
      // sit where the last active-mesh pass left them (see
      // maps/tarkan/impactGlowObject.ts).
      bone.computeWorldMatrix(true);

      const p = bone.getAbsolutePosition();
      this.#flares[i].moveTo(p.x, p.y, p.z);
    }

    const breath = this.#breath;
    if (!breath) return;

    const { from, to } = this.breath();
    const frame = this.actionFrame();

    if (frame >= from && frame < to) breath.update();
  }
}

/** Vulcanus 67 (GM_PK_Field.cpp:412-462), x1. */
export class VulcanusMagmaFishObject extends MagmaFishObject {
  protected breath(): Breath {
    return BREATH_67;
  }
}

/** Vulcanus 68 (GM_PK_Field.cpp:463-495), x1. */
export class VulcanusMagmaFish2Object extends MagmaFishObject {
  protected breath(): Breath {
    return BREATH_68;
  }
}
