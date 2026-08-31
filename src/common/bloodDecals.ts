import type { Vector3 } from '../libs/babylon/exports';
import type { World } from '../ecs/world';
import { TerrainDecal } from './moveTargetEffect';

/**
 * CreateBlood (ZzzEffectBlurSpark.cpp:443) + the BITMAP_BLOOD pointer effect
 * (ZzzEffectPointer.cpp:20-100): two blood splats dropped under the head
 * bone when a character starts its Die clip, each 0.8-1.2 tiles wide with
 * a random rotation, alive for 50 + rand(31) ticks and fading out over the
 * last 50.
 */

const BLOOD_TEXTURE = 'Effect/blood01.ozt';
const POOL_SIZE = 24;
const TICKS_PER_SECOND = 25;
const FADE_TICKS = 50;
const HEAD_SPREAD = 0.5; // +-50 cm around the head bone

type Splat = {
  decal: TerrainDecal;
  lifeTicks: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  light: [number, number, number];
};

export class BloodDecals {
  readonly #splats: Splat[] = [];
  #next = 0;

  constructor(private readonly world: World) {}

  #acquire(): Splat {
    if (this.#splats.length < POOL_SIZE) {
      const splat: Splat = {
        decal: new TerrainDecal(
          this.world,
          `blood${this.#splats.length}`,
          BLOOD_TEXTURE,
          1.2,
          'alpha'
        ),
        lifeTicks: 0,
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        light: [1, 1, 1],
      };
      this.#splats.push(splat);
      return splat;
    }
    // Oldest-first reuse, like the pointer ring in the original.
    const splat = this.#splats[this.#next];
    this.#next = (this.#next + 1) % POOL_SIZE;
    return splat;
  }

  /** CreateBlood: two splats around `headPos` (world units; y ignored). */
  spawn(headPos: Vector3, light: Vector3): void {
    for (let i = 0; i < 2; i++) {
      const splat = this.#acquire();
      splat.x = headPos.x + (Math.random() - 0.5) * 2 * HEAD_SPREAD;
      splat.y = headPos.z + (Math.random() - 0.5) * 2 * HEAD_SPREAD;
      splat.rotation = Math.random() * 360;
      splat.scale = 0.8 + Math.random() * 0.4;
      splat.light = [light.x, light.y, light.z];
      splat.lifeTicks = 50 + Math.floor(Math.random() * 32);
      splat.decal.setAlpha(1);
      splat.decal.draw(
        this.world,
        splat.x,
        splat.y,
        splat.scale,
        splat.rotation,
        splat.light
      );
    }
  }

  update(dt: number): void {
    const ticks = dt * TICKS_PER_SECOND;
    for (const splat of this.#splats) {
      if (splat.lifeTicks <= 0) continue;
      splat.lifeTicks -= ticks;
      if (splat.lifeTicks <= 0) {
        splat.lifeTicks = 0;
        splat.decal.hide();
        continue;
      }
      if (splat.lifeTicks < FADE_TICKS) {
        splat.decal.setAlpha(splat.lifeTicks / FADE_TICKS);
      }
      // Re-drape in case the texture finished loading after spawn.
      if (!splat.decal.enabled) {
        splat.decal.draw(
          this.world,
          splat.x,
          splat.y,
          splat.scale,
          splat.rotation,
          splat.light
        );
      }
    }
  }

  clear(): void {
    for (const splat of this.#splats) {
      splat.lifeTicks = 0;
      splat.decal.hide();
    }
  }
}
