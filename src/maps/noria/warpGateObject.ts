import { ParticleEmitter } from '../../common/effectParticles';
import { loadGLTF } from '../../common/modelLoader';
import { ModelObject } from '../../common/modelObject';
import { Rand } from '../../common/rand';
import type { Entity, World } from '../../ecs/world';

/** 25 Hz, the tick `FPS_ANIMATION_FACTOR` is measured in. */
const TICKS_PER_SECOND = 25;

const DEGREES_TO_RADIANS = Math.PI / 180;

/**
 * `o->Angle[1] += (4.0f + o->Gravity) * FPS_ANIMATION_FACTOR`
 * (ZzzEffect.cpp:7186). `Gravity` is `(float)(rand() % 80) / 10.f` for
 * warp01/02 (ZzzEffect.cpp:567) and untouched — so zero — for warp03
 * (:552-556), giving 4…11.9 degrees a tick, i.e. 100…298 deg/s.
 */
const SPIN_BASE_DEGREES = 4;
const SPIN_GRAVITY_MAX = 8;

/**
 * `o->Scale = 1.3f + (float)(rand() % 50) / 100.f` (ZzzEffect.cpp:566).
 * warp03 is a flat 0.6 (:556) and is scaled by the entity instead, so this
 * only serves the four ring copies.
 */
const RING_SCALE_MIN = 1.3;
const RING_SCALE_SPREAD = 0.5;

/**
 * The Noria warp gate, `MapManager.cpp:100-103`: one `CreateObject(MODEL_WARP)`
 * at `Pos = (223 * TERRAIN_SCALE, 30 * TERRAIN_SCALE, 0)`, angle `(0, 0, 10)`,
 * which `CreateObject` (ZzzObject.cpp:4675-4693) answers with five stacked
 * effects at `z + 350` — warp01, warp02, warp01, warp02, warp03, offset along
 * Y by 0/4/8/12/20.
 *
 * The base object itself is not spawned here, and that is not a shortcut: its
 * Z is left at 0 while TerrainHeight.OZB reads 1.80 tiles at (223, 30), and
 * warp01 only reaches 1.22 tiles above its own origin, so the original buries
 * the whole gate model 58 MU under the ground. Nothing of it is ever on
 * screen; the five effects floating at 3.5 tiles are the visible gate.
 *
 * Each effect is `o->BlendMesh = -2` — the original's "additive whole body",
 * which maps onto `BlendMesh = 0` here because all three warp models convert
 * to exactly one mesh.
 */
export class NoriaWarpHaloObject extends ModelObject {
  CastsShadow = false;

  /** Radians a second, from the per-instance `Gravity` roll. */
  #spin = 0;

  #sparks: ParticleEmitter | null = null;

  #elapsedMs = 0;

  /** The entity rotation the render system reads back; see init(). */
  #rot: { x: number; y: number; z: number } | null = null;

  /** File under `NPC/`; the stack alternates warp01 and warp02, then warp03. */
  protected modelFile(): string {
    return 'NPC/warp01.glb';
  }

  /**
   * `Gravity` is only rolled for the warp01/02 rings; warp03 spins at the
   * bare 4 deg/tick.
   */
  protected gravity(): number {
    return Rand.nextFloat(0, SPIN_GRAVITY_MAX);
  }

  /**
   * Where the gate's spark ring sits relative to *this* halo, in tiles, or
   * null for the halos that carry none. `MoveObject` (ZzzObject.cpp:3920-3925)
   * hangs it off the buried base object at `Position[1] - 50`, `z + 350`;
   * since that object is not spawned, the one warp03 halo carries it and
   * corrects for its own +20 MU Y offset.
   */
  protected sparkRingOffsetZ(): number | null {
    return null;
  }

  async init(world: World, entity: Entity) {
    // Set before load(): applyBlendMesh runs inside it.
    this.BlendMesh = 0;

    // The spin has to live on the *entity*, not on `node.rotation`: the render
    // system re-derives the node's Euler angles from `transform.rot` through
    // `toRenderAngles` after every Update (renderSystem.ts:81-95), so anything
    // written straight onto the node is overwritten the same frame.
    this.#rot = entity.transform?.rot ?? null;

    this.#spin =
      (SPIN_BASE_DEGREES + this.gravity()) *
      TICKS_PER_SECOND *
      DEGREES_TO_RADIANS;

    this.load(await loadGLTF(this.modelFile(), world));

    const sparkZ = this.sparkRingOffsetZ();

    if (sparkZ !== null) {
      const p = this.node.position;

      this.#sparks = new ParticleEmitter(
        world.scene,
        // `CreateParticleFpsChecked(BITMAP_SPARK + 1, …, 9, 1.4f)` — one a
        // tick at 25 Hz. `spark03_24` is the same Spark03 sheet; the subtype
        // 9 variant's own motion curve is not ported.
        [{ kinds: ['spark03_24'], every: 1, count: 1, light: [0.5, 0.5, 0.5] }],
        { x: p.x, y: p.y, z: p.z + sparkZ },
        0,
        1.4
      );
    }
  }

  dispose(): void {
    this.#sparks = null;
    this.#rot = null;
    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    if (!this.Ready) return;

    this.#sparks?.update();

    if (this.OutOfView) return;

    const deltaSeconds = this.node.getScene().getEngine().getDeltaTime() / 1000;

    // `Angle[1]` is the MU Y axis, which the loader's `-toRadians(rot.y)` puts
    // in `transform.rot.z` and `toRenderAngles` passes through unchanged —
    // hence the minus. These discs face along Y, so this is the portal
    // spinning in its own plane. Wrapped so the accumulator keeps its
    // precision over a long session.
    if (this.#rot) {
      this.#rot.z =
        (this.#rot.z - this.#spin * deltaSeconds) % (Math.PI * 2);
    }

    const mesh = this.getMesh(0);
    if (!mesh?.metadata) return;

    // `WorldTime`, in milliseconds. It is accumulated from the engine delta
    // rather than read off `gameTime`, which is a fixed 0.1 s in this build
    // (ecs/world.ts:244) — the same reason effectParticles keeps its own.
    this.#elapsedMs += deltaSeconds * 1000;

    const t = this.#elapsedMs;

    // `Vector(fTemp1 + 0.01f, fTemp2 + 0.01f, fTemp3 + 0.01f, o->Light)` with
    // `fTempN = sinf(WorldTime * 0.0011f / 0.0017f / 0.0013f) * 0.2f`
    // (ZzzEffect.cpp:7182-7185): three channels drifting out of phase, which
    // is what washes the portal between blue, green and violet.
    //
    // The clone's blend-mesh path carries one brightness scalar per mesh, not
    // a colour, so the drift has to collapse. It collapses to the *brightest*
    // channel rather than to their mean: on an additively blended body the eye
    // reads the peak, and the mean would have halved an already near-black
    // light into nothing.
    const light =
      Math.max(
        Math.sin(t * 0.0011),
        Math.sin(t * 0.0017),
        Math.sin(t * 0.0013)
      ) *
        0.2 +
      0.01;

    mesh.metadata.blendMeshLight = Math.max(0, light);
  }
}

/** The two warp02 copies in the stack (y + 4 and y + 12). */
export class NoriaWarpHalo2Object extends NoriaWarpHaloObject {
  protected modelFile(): string {
    return 'NPC/warp02.glb';
  }
}

/**
 * The single warp03 copy (y + 20): a flat 5-tile disc rather than a ring, no
 * `Gravity` roll, and the carrier for the gate's spark ring.
 */
export class NoriaWarpHalo3Object extends NoriaWarpHaloObject {
  protected modelFile(): string {
    return 'NPC/warp03.glb';
  }

  protected gravity(): number {
    return 0;
  }

  protected sparkRingOffsetZ(): number | null {
    // -50 MU from the gate origin, minus this halo's own +20 MU.
    return -0.7;
  }
}

/** Per-instance scale for the four ring copies; warp03 is a fixed 0.6. */
export function warpRingScale(): number {
  return RING_SCALE_MIN + Rand.nextFloat(0, RING_SCALE_SPREAD);
}
