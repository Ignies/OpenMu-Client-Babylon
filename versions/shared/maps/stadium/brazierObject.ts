import {
  createMovableFlare,
  type MovableFlare,
} from '@/controllers/lighting/effectLights';
import {
  BonedParticleEmitter,
  type BonedEmission,
} from '@/controllers/fx/effectParticles';
import { MapTileObject } from '@/controllers/terrain/mapTileObject';
import { Ecs } from '@/ecs/current';
import type { Entity, World } from '@/ecs/world';
import { reportLoadFailure } from '@/controllers/assets';

type BoneNode = BonedEmission['node'];

/**
 * `b->TransformPosition(BoneTransform[1], …)` (ZzzObject.cpp:2945).
 * `Object7/Object10.glb` has exactly two bones - bone 0 `Box01` is the pillar
 * (au_03, z 0…1.08 tiles) and bone 1 `Bone01` sits in the bowl (au_04,
 * z 1.08…2.38) - so bone 1 is the flame.
 */
const FLAME_BONE = 1;

/**
 * `Vector(Luminosity * 0.6f, Luminosity * 0.3f, Luminosity * 0.1f, Light)`
 * (ZzzObject.cpp:2944), carried through as written: unlike the terrain light
 * in spec.ts, a sprite colour is not multiplied by anything else, so the
 * original's ratios and magnitude both apply.
 */
const FLARE_COLOR: readonly [number, number, number] = [0.6, 0.3, 0.1];

/** `Scale = Luminosity * 5.f` (ZzzObject.cpp:2943), no `* o->Scale`: 3.5…4.95. */
const FLARE_SCALE = 5;

/** `Luminosity = (float)(rand() % 30 + 70) * 0.01f` (ZzzObject.cpp:2737). */
const LUMINOSITY_MIN = 0.7;
const LUMINOSITY_STEPS = 30;
const LUMINOSITY_STEP = 0.01;

/** Updates to wait for the skeleton to be posed before lighting anyway. */
const POSE_WAIT_LIMIT = 120;

/**
 * The Stadium brazier (type 9, `Object7/Object10.glb`, n=32 in
 * EncTerrain7.obj). The arena's only light source and the only thing on the
 * map with a `RenderObjectVisual` case of its own.
 *
 * **The original's bug, and what "porting the intent" means here.** The C++ is
 *
 * ```cpp
 * b->TransformPosition(BoneTransform[1], Position, p);
 * CreateSprite(BITMAP_LIGHT, p, Scale, Light, o);
 * ```
 *
 * but `TransformPosition` takes (matrix, in, out): the arguments are swapped,
 * so it transforms an **uninitialised** `Position` and the sprite lands at
 * whatever the stack held. Every other caller in the file passes a `p` it has
 * just filled with `Vector(…, p)` first (see ZzzObject.cpp:2753-2754). The
 * same typo sits on Lorencia's merchant animal at ZzzObject.cpp:2764/2766,
 * which is how you can tell it is a slip rather than a trick - nobody writes
 * the same undefined read twice on purpose.
 *
 * What was meant is unambiguous: local (0,0,0) through bone 1, i.e. the bone's
 * own world position, with a warm light sprite on it. That is what this does.
 *
 * The fire particles and the pose-wait are ours; the floor light is in
 * spec.ts. Auto-attack and auto-targeting are disabled in this world (the same
 * rule Chaos Castle runs under) - that is combat work and is not touched
 * here. Music and ambience are handled centrally, and Stadium deliberately has
 * neither: the arena is silent in the original.
 */
export class StadiumBrazierObject extends MapTileObject {
  #bone: BoneNode | null = null;
  #flare: MovableFlare | null = null;
  #fire: BonedParticleEmitter | null = null;
  #lit = false;
  #waited = 0;
  #disposed = false;

  async init(world: World, entity: Entity) {
    await super.init(world, entity);

    if (!this.gltf) return;

    const prefix = `bone_${FLAME_BONE}_`;

    for (const bone of this.gltf.skeleton?.bones ?? []) {
      const node = bone.getTransformNode();

      if (node?.name.startsWith(prefix)) {
        this.#bone = node;
        break;
      }
    }

    // Not every skeleton hands its bones a linked transform node; walking the
    // node graph by name is the same lookup MapTileObject's wall torch uses,
    // and it is what the converter guarantees (`bone_<i>_<bmdName>`,
    // tools/bmdToGlb.ts:283).
    if (!this.#bone) {
      const node = this.gltf.mesh
        .getDescendants(false)
        .find(n => n.name.startsWith(prefix));

      if (node && 'getAbsolutePosition' in node) {
        this.#bone = node as BoneNode;
      }
    }

    if (!this.#bone) return;

    const scale = this.node.scaling.x;

    // Ours. 32 braziers ring the arena, so the recipe is the restrained one:
    // two flame sprites and a wisp of smoke every fourth tick, which fills the
    // bowl at this scale without spending the shared 2048-sprite pool on a map
    // whose whole point is what the two players in the middle are doing.
    this.#fire = new BonedParticleEmitter(world.scene, [
      {
        node: this.#bone,
        kinds: ['fire157'],
        count: 1,
        scale: scale * 0.28,
        light: [0.9, 0.5, 0],
      },
      {
        node: this.#bone,
        kinds: ['fire157'],
        count: 1,
        scale: scale * 0.14,
        light: [0.75, 0.35, 0],
      },
      {
        node: this.#bone,
        kinds: ['smoke65'],
        count: 1,
        scale: scale * 0.16,
        light: [1, 1, 1],
        every: 4,
      },
    ]);
  }

  /**
   * BMD bone transforms only exist once a render has posed the skeleton, so
   * the flare waits for bone 1 to leave the object origin - created earlier it
   * would spend its first frames at the foot of the pillar.
   */
  #posed(): boolean {
    if (!this.#bone) return false;

    const origin = this.node.getAbsolutePosition();
    const p = this.#bone.getAbsolutePosition();

    return (
      Math.abs(p.x - origin.x) > 1e-3 ||
      Math.abs(p.y - origin.y) > 1e-3 ||
      Math.abs(p.z - origin.z) > 1e-3
    );
  }

  #light(world: World): void {
    this.#lit = true;

    const bone = this.#bone;
    if (!bone) return;

    void createMovableFlare(world.scene, FLARE_SCALE, FLARE_COLOR).then(flare => {
      if (!flare) return;

      if (this.#disposed) {
        flare.dispose();
        return;
      }

      const p = bone.getAbsolutePosition();
      flare.moveTo(p.x, p.y, p.z);

      this.#flare = flare;
    }).catch(reportLoadFailure('effect light flare'));
  }

  dispose(): void {
    this.#disposed = true;

    this.#flare?.dispose();
    this.#flare = null;
    this.#fire = null;
    this.#bone = null;

    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    if (!this.Ready || !this.#bone) return;

    const world = Ecs.world;
    if (!world) return;

    if (!this.#lit) {
      if (this.#posed() || ++this.#waited >= POSE_WAIT_LIMIT) this.#light(world);
      return;
    }

    if (this.OutOfView) return;

    this.#fire?.update();

    const flare = this.#flare;
    if (!flare) return;

    // The original re-rolls Luminosity every frame into the card's colour and size.
    const lumi =
      LUMINOSITY_MIN +
      Math.floor(Math.random() * LUMINOSITY_STEPS) * LUMINOSITY_STEP;

    const p = this.#bone.getAbsolutePosition();

    flare.moveTo(p.x, p.y, p.z);
    flare.setLuminosity(lumi);
    flare.setScale(FLARE_SCALE * lumi);
  }
}
