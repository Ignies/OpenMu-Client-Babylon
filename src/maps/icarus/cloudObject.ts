import { TILE_CM } from '../../common/terrain/consts';
import { Sprite, type Scene } from '../../libs/babylon/exports';
import type { Entity, World } from '../../ecs/world';
import { HIDDEN_MESH_ALL, ModelObject } from '../../common/modelObject';
import {
  CLOUD_LIGHT_TEXTURE,
  CLOUD_TEXTURE,
  getSkySpritePool,
  type SkySpritePool,
} from './skySprites';

/**
 * Billboards per emitter, by type — `RenderObjectVisual` spawns 20 for types
 * 0-2 and 10 for types 3-5 (ZzzObject.cpp:3052-3096). The type is also the
 * particle's SubType, which is what decides the spin direction below.
 */
const CLOUD_COUNT: readonly number[] = [20, 20, 20, 10, 10, 10];

/** `o->Position` ± this on x/y at spawn (MU units, ZzzEffectParticle.cpp:7910). */
const SPREAD_MU = 250;

/** …and `+20 … +40` on z, the only axis the spread is one-sided on. */
const RISE_MIN_MU = 20;
const RISE_RANGE_MU = 21;

/** `Scale = (rand()%20 + 180) * 0.01f` — 1.80 … 1.99, independent of `o->Scale`. */
const SCALE_MIN = 1.8;
const SCALE_RANGE = 0.2;

/**
 * `Position.z = start.z + sinf((WorldTime + Gravity) / 5000.f) * 20.f`
 * (ZzzEffectParticle.cpp:9157). `Gravity` is a per-particle `rand()%1000`
 * phase, so a bank breathes out of step with itself; the period is
 * 2π·5000 ms ≈ 31 s and the throw is 20 MU, i.e. a drift you notice only by
 * looking away and back.
 */
const BOB_PERIOD_MS = 5000;
const BOB_AMPLITUDE_MU = 20;
const BOB_PHASE_RANGE_MS = 1000;

/**
 * `TurningForce = o->Scale + (rand()%30) * 0.01f`, spun at `±0.02 *
 * TurningForce` degrees per millisecond about the view axis — a full turn in
 * roughly 15-20 s at the map's usual object scales.
 */
const SPIN_DEG_PER_MS = 0.02;
const SPIN_JITTER = 0.3;

/** `Light = (0.1f, 0.1f, 0.1f)` (ZzzObject.cpp:3054). Dim, and meant to stack. */
const CLOUD_LIGHT = 0.1;

/** MU units per world unit. */

/** 25 Hz, the rate every `rand_fps_check` in the original is counted against. */
const TICKS_PER_SECOND = 25;

/** `MoveObjectOnEffect`'s `rand_fps_check(10)` — one tick in ten. */
const GLOW_CHANCE = 10;

/** `CreateParticle(BITMAP_CLOUD+1, …, 0.5f)` (ZzzObject.cpp:4338-4356). */
const GLOW_SCALE = 0.5;

/** `Light = (rand()%20 * 0.01f, …)` on each channel independently — 0 … 0.19. */
const GLOW_LIGHT_RANGE = 0.2;

/**
 * Ticks a glow lives. Not recoverable from the call site — the original leaves
 * the particle's own default — so it is set to read as a blink rather than as
 * a second, steadier cloud: about half a second, fading out the whole way.
 */
const GLOW_LIFE_TICKS = 12;

/** Concurrent glows per emitter, so a stalled frame cannot burst the pool. */
const GLOW_LIMIT = 2;

type Cloud = {
  readonly sprite: Sprite;
  readonly baseX: number;
  readonly baseY: number;
  readonly baseZ: number;
  readonly phase: number;
  readonly spin: number;
  angle: number;
};

type Glow = {
  readonly sprite: Sprite;
  life: number;
  readonly r: number;
  readonly g: number;
  readonly b: number;
};

const rand = (n: number) => Math.floor(Math.random() * n);

/**
 * Which way a cloud turns, from its emitter's type (the particle SubType) and
 * its index in the bank (ZzzEffectParticle.cpp:3052). Types 1 and 4 turn one
 * way, 2 and 5 the other, and 0 and 3 split their own bank down the middle so
 * a single emitter's clouds counter-rotate against each other.
 */
function spinSign(type: number, index: number): number {
  if (type === 1 || type === 4) return 1;
  if (type === 2 || type === 5) return -1;

  return index % 2 === 0 ? 1 : -1;
}

/**
 * Icarus types 0-5: the cloud emitters.
 *
 * All six ids carry the same 50 MU `연기박스` box mesh and all six hide it on
 * their first visible frame (`o->HiddenMesh = -2`) and stand a bank of cloud
 * billboards in its place. This object skips the model entirely rather than
 * loading it and setting `HiddenMesh` the way `OperateBoxObject` does: the box
 * is not a click target, has no bones anything hangs off, and 335 of them
 * stand on the map, so loading `Object01.glb` 335 times to never draw it is
 * pure download and pure memory. `HiddenMesh` is still set for anything that
 * reads it, and `Ready` is set by hand because `ModelLoaderSystem` treats an
 * `init()` that resolves with neither a `gltf` nor `Ready` as a load failure.
 *
 * The bank is created once, when the object is built, and released when it is
 * disposed — which `ModelLoaderSystem` does on the visibility transition, so
 * "alive while the owner is visible" falls out of the entity's own lifetime
 * exactly as it does in the original.
 */
export class IcarusCloudObject extends ModelObject {
  CastsShadow = false;

  #scene: Scene | null = null;

  #clouds: Cloud[] = [];

  #glows: Glow[] = [];

  #cloudPool: SkySpritePool | null = null;

  #glowPool: SkySpritePool | null = null;

  #tickDue = 0;

  #disposed = false;

  async init(world: World, entity: Entity) {
    await super.init(world, entity);

    this.#scene = world.scene;

    this.HiddenMesh = HIDDEN_MESH_ALL;
    this.Visible = false;
    this.Ready = true;

    const pool = await getSkySpritePool(world.scene, CLOUD_TEXTURE);

    // Disposed while the texture was in flight: the entity left the
    // visibility radius before its clouds ever appeared.
    if (!pool || this.#disposed) return;

    this.#cloudPool = pool;
    this.#spawnBank(pool);

    const glowPool = await getSkySpritePool(world.scene, CLOUD_LIGHT_TEXTURE);

    if (!glowPool || this.#disposed) return;

    this.#glowPool = glowPool;
  }

  #spawnBank(pool: SkySpritePool): void {
    const origin = this.node.position;
    const ownerScale = this.node.scaling.x;
    const count = CLOUD_COUNT[this.Type] ?? 0;

    for (let i = 0; i < count; i++) {
      const sprite = pool.acquire();

      // Budget spent (see CLOUD_TEXTURE): a thinner bank, not a dropped one.
      if (!sprite) break;

      const scale = SCALE_MIN + Math.random() * SCALE_RANGE;
      const size = pool.sizeFor(scale);

      sprite.width = size;
      sprite.height = size;
      sprite.color.set(CLOUD_LIGHT, CLOUD_LIGHT, CLOUD_LIGHT, 1);

      // MU x/y are the ground plane and MU z is up, so the one-sided rise goes
      // on Babylon's y. The original scales the offsets by the frame factor
      // `CreateParticleFpsChecked` was called with, which is an artefact of
      // spawning inside a per-frame call — a bank created once has no frame to
      // be a fraction of.
      const cloud: Cloud = {
        sprite,
        baseX: origin.x + (rand(SPREAD_MU * 2) - SPREAD_MU) / TILE_CM,
        baseY:
          origin.y + (RISE_MIN_MU + rand(RISE_RANGE_MU)) / TILE_CM,
        baseZ: origin.z + (rand(SPREAD_MU * 2) - SPREAD_MU) / TILE_CM,
        phase: rand(BOB_PHASE_RANGE_MS),
        spin:
          spinSign(this.Type, i) *
          SPIN_DEG_PER_MS *
          (ownerScale + Math.random() * SPIN_JITTER),
        angle: rand(360),
      };

      sprite.position.set(cloud.baseX, cloud.baseY, cloud.baseZ);

      this.#clouds.push(cloud);
    }
  }

  /**
   * `MoveObjectOnEffect` (ZzzObject.cpp:4338): one frame in ten, a cloud
   * object grows a dim `cloudLight` sprite and two thunder joints. The joints
   * are ribbons drawn by `CreateJoint`, which has no counterpart in this
   * client, so only the sprite is reproduced — which is the half that carries,
   * since the joints are two 40 MU wide bolts seen against a bank five tiles
   * across.
   */
  #spawnGlow(pool: SkySpritePool): void {
    if (this.#glows.length >= GLOW_LIMIT) return;

    const sprite = pool.acquire();
    if (!sprite) return;

    const size = pool.sizeFor(GLOW_SCALE);

    sprite.width = size;
    sprite.height = size;
    sprite.angle = 0;
    sprite.position.copyFrom(this.node.position);

    this.#glows.push({
      sprite,
      life: GLOW_LIFE_TICKS,
      r: Math.random() * GLOW_LIGHT_RANGE,
      g: Math.random() * GLOW_LIGHT_RANGE,
      b: Math.random() * GLOW_LIGHT_RANGE,
    });
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    const scene = this.#scene;
    if (!scene) return;

    const deltaMs = scene.getEngine().getDeltaTime();
    const worldTimeMs = gameTime.TotalGameTime.TotalSeconds * 1000;

    for (const cloud of this.#clouds) {
      cloud.angle += cloud.spin * deltaMs;

      cloud.sprite.position.y =
        cloud.baseY +
        (Math.sin((worldTimeMs + cloud.phase) / BOB_PERIOD_MS) *
          BOB_AMPLITUDE_MU) /
          TILE_CM;

      // Babylon's sprite angle is a rotation in the screen plane, which is
      // what the original's spin about the view axis amounts to.
      cloud.sprite.angle = (cloud.angle * Math.PI) / 180;
    }

    // Everything below is a `rand_fps_check`, so it is counted in the
    // original's 25 Hz ticks rather than in frames.
    this.#tickDue += (deltaMs / 1000) * TICKS_PER_SECOND;

    if (this.#tickDue > 4) this.#tickDue = 4;

    while (this.#tickDue >= 1) {
      this.#tickDue -= 1;

      for (let i = this.#glows.length - 1; i >= 0; i--) {
        const glow = this.#glows[i];

        glow.life -= 1;

        if (glow.life <= 0) {
          this.#glowPool?.release(glow.sprite);
          this.#glows.splice(i, 1);
          continue;
        }

        const fade = glow.life / GLOW_LIFE_TICKS;

        glow.sprite.color.set(glow.r * fade, glow.g * fade, glow.b * fade, 1);
      }

      if (this.#glowPool && rand(GLOW_CHANCE) === 0) {
        this.#spawnGlow(this.#glowPool);
      }
    }
  }

  dispose(): void {
    this.#disposed = true;

    for (const cloud of this.#clouds) this.#cloudPool?.release(cloud.sprite);
    this.#clouds.length = 0;

    for (const glow of this.#glows) this.#glowPool?.release(glow.sprite);
    this.#glows.length = 0;

    this.#cloudPool = null;
    this.#glowPool = null;
    this.#scene = null;

    super.dispose();
  }
}
