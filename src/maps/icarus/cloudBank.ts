import { TILE_CM } from '../../common/terrain/consts';
import type { Scene, Sprite, Vector3 } from '../../libs/babylon/exports';
import { spriteLevel } from '../../effects/core';
import type { SkySpritePool } from './skySprites';

/**
 * A bank of `BITMAP_CLOUD` billboards that a map object stands in place of its
 * own mesh, for as long as the object is in view: the default branch of the
 * particle (SubTypes 0-5 and 7, ZzzEffectParticle.cpp), whose life is reset
 * every frame its owner is `Visible`. Icarus' cloud boxes and Chaos Castle's
 * fog markers are both this.
 */

/** `o->Position` ± this on x/y at spawn (MU units, ZzzEffectParticle.cpp:7910). */
const SPREAD_MU = 250;

/** …and `+20 … +40` on z, the only axis the spread is one-sided on. */
const RISE_MIN_MU = 20;
const RISE_RANGE_MU = 21;

/** `Scale = (rand()%20 + 180) * 0.01f` - 1.80 … 1.99, independent of `o->Scale`. */
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
 * TurningForce` degrees per millisecond about the view axis - a full turn in
 * roughly 15-20 s at the map's usual object scales.
 */
const SPIN_DEG_PER_MS = 0.02;
const SPIN_JITTER = 0.3;

export type CloudBankSpec = {
  /** Billboards in the bank. */
  readonly count: number;
  /** The particle's SubType, which decides which way each cloud turns. */
  readonly subType: number;
  /** `Light`, per channel. Dim, and meant to stack. */
  readonly light: readonly [number, number, number];
};

type Cloud = {
  readonly sprite: Sprite;
  readonly baseY: number;
  readonly phase: number;
  readonly spin: number;
  angle: number;
};

const rand = (n: number) => Math.floor(Math.random() * n);

/**
 * Which way a cloud turns, from the particle SubType and its index in the
 * bank (ZzzEffectParticle.cpp:3052). 1 and 4 turn one way, 2 and 5 the
 * other, 0 and 3 split their own bank down the middle so a single emitter's
 * clouds counter-rotate against each other, and the rest hold still.
 */
function spinSign(subType: number, index: number): number {
  if (subType === 1 || subType === 4) return 1;
  if (subType === 2 || subType === 5) return -1;
  if (subType === 0 || subType === 3) return index % 2 === 0 ? 1 : -1;

  return 0;
}

export class CloudBank {
  #clouds: Cloud[] = [];

  constructor(
    private readonly scene: Scene,
    private readonly pool: SkySpritePool
  ) {}

  /** Stands the bank around `origin`; `ownerScale` is the object's `o->Scale`. */
  spawn(origin: Vector3, ownerScale: number, spec: CloudBankSpec): void {
    const [r, g, b] = spec.light;

    for (let i = 0; i < spec.count; i++) {
      const sprite = this.pool.acquire();

      // Budget spent (see CLOUD_TEXTURE): a thinner bank, not a dropped one.
      if (!sprite) break;

      const scale = SCALE_MIN + Math.random() * SCALE_RANGE;
      const size = this.pool.sizeFor(scale);

      sprite.width = size;
      sprite.height = size;
      spriteLevel(this.scene, sprite.color.set(r, g, b, 1));

      // MU x/y are the ground plane and MU z is up, so the one-sided rise goes
      // on Babylon's y. The original scales the offsets by the frame factor
      // `CreateParticleFpsChecked` was called with, which is an artefact of
      // spawning inside a per-frame call - a bank created once has no frame to
      // be a fraction of.
      const cloud: Cloud = {
        sprite,
        baseY: origin.y + (RISE_MIN_MU + rand(RISE_RANGE_MU)) / TILE_CM,
        phase: rand(BOB_PHASE_RANGE_MS),
        spin:
          spinSign(spec.subType, i) *
          SPIN_DEG_PER_MS *
          (ownerScale + Math.random() * SPIN_JITTER),
        angle: rand(360),
      };

      sprite.position.set(
        origin.x + (rand(SPREAD_MU * 2) - SPREAD_MU) / TILE_CM,
        cloud.baseY,
        origin.z + (rand(SPREAD_MU * 2) - SPREAD_MU) / TILE_CM
      );

      this.#clouds.push(cloud);
    }
  }

  update(deltaMs: number, worldTimeMs: number): void {
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
  }

  dispose(): void {
    for (const cloud of this.#clouds) this.pool.release(cloud.sprite);
    this.#clouds.length = 0;
  }
}
