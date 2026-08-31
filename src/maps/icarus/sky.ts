import { TILE_CM } from '../../common/terrain/consts';
import type { Observer, Scene } from '../../libs/babylon/exports';
import type { World } from '../../ecs/world';
import { createMovableFlare, type MovableFlare } from '../../common/effectLights';
import { strikeThunder } from '../../lighting/sky';

/** MU units per world unit. */

/** 25 Hz, the rate `rand_fps_check(n)` counts its one-in-n against. */
const TICKS_PER_SECOND = 25;

/** `MoveHeavenThunder`'s `rand_fps_check(50)` — a strike every ~2 s. */
const THUNDER_CHANCE = 50;

/** `position.x = Hero->Position.x + rand()%300 - 150` (ZzzObject.cpp:4207). */
const THUNDER_SPREAD_MU = 150;

/*
 * The flash itself — its luminosity roll, colour, reach and decay — is the
 * lighting layer's `sky` entry (`src/lighting/sky.ts`, `strikeThunder`).
 */

/** `MoveObjectSetting`'s `rand_fps_check(10)` (ZzzObject.cpp:4299). */
const SPARKLE_CHANCE = 10;

/** `Hero->Position + (rand()%5000 - 2500, rand()%5000 - 2500, -1000)`. */
const SPARKLE_SPREAD_MU = 2500;
const SPARKLE_DROP_MU = 1000;

/**
 * Ring of reusable flares, and how long one lives.
 *
 * At one spawn per ten ticks a strike is due every 400 ms, so six flares are
 * three times what a 1.2 s life needs — the spare slots absorb the run of
 * consecutive hits the geometric distribution guarantees. The lifetime is
 * ours: the original leaves `BITMAP_LIGHT` to its own default, and a twinkle
 * is what the effect is for.
 */
const SPARKLE_RING = 6;
const SPARKLE_LIFE_TICKS = 30;

/** `BITMAP_LIGHT` is drawn white here; only its position is randomised. */
const SPARKLE_SCALE = 1.5;
const SPARKLE_COLOR: readonly [number, number, number] = [1, 1, 1];

type Sparkle = {
  flare: MovableFlare;
  life: number;
};

const rand = (n: number) => Math.floor(Math.random() * n);

/**
 * The two world-level movers Icarus runs every frame, which belong to the map
 * rather than to any object on it: `MoveHeavenThunder` (ZzzObject.cpp:4204)
 * and the Icarus half of `MoveObjectSetting` (ZzzObject.cpp:4299). Both are
 * hero-relative — they follow the player around a map with no fixed emitter to
 * hang off — so they live here, created by `createIcarus` and torn down with
 * the map through the entity's `onDispose`.
 *
 * Deliberately not reproduced:
 *  - the thunder bolts themselves. `MoveHeavenThunder` picks one of four
 *    randomised layouts of `CreateJoint(BITMAP_JOINT_THUNDER+1, …)` ribbons at
 *    z-300, 40-49 MU wide, on the one-in-five strikes that are forked. There
 *    is no `CreateJoint` equivalent in this client — joints are a trailing
 *    ribbon primitive, not a sprite — and faking them with billboards would
 *    read as a row of stamps rather than as a bolt.
 *  - the `MODEL_CLOUD` flash plane (`CreateEffect(MODEL_CLOUD, Hero->Position,
 *    …)`, `Scale` 10, `LifeTime` 2, `BlendMesh` 0), for the same reason: it
 *    needs the effect-model pipeline, not a sprite. Its contribution is folded
 *    into the light pulse instead — see THUNDER_RANGE.
 */
export class IcarusSky {
  #observer: Observer<Scene> | null = null;

  #scene: Scene;

  #world: World;

  #tickDue = 0;

  /** Where the last strike landed; the strike light copies it. */
  #flashPosition = { x: 0, y: 0, z: 0 };

  #sparkles: Sparkle[] = [];

  #sparkleCursor = 0;

  #disposed = false;

  constructor(world: World) {
    this.#world = world;
    this.#scene = world.scene;

    for (let i = 0; i < SPARKLE_RING; i++) {
      void createMovableFlare(
        this.#scene,
        SPARKLE_SCALE,
        SPARKLE_COLOR
      ).then(flare => {
        if (!flare) return;

        if (this.#disposed) {
          flare.dispose();
          return;
        }

        flare.setLuminosity(0);
        this.#sparkles.push({ flare, life: 0 });
      });
    }

    this.#observer = this.#scene.onBeforeRenderObservable.add(() =>
      this.#update()
    );
  }

  #update(): void {
    const deltaMs = this.#scene.getEngine().getDeltaTime();

    const hero = this.#world.playerEntity;
    if (!hero) return;

    const pos = hero.transform.pos;

    this.#tickDue += (deltaMs / 1000) * TICKS_PER_SECOND;

    // A long stall must not fire a burst of strikes on the frame it ends.
    if (this.#tickDue > 4) this.#tickDue = 4;

    while (this.#tickDue >= 1) {
      this.#tickDue -= 1;

      this.#ageSparkles();

      if (rand(THUNDER_CHANCE) === 0) this.#strike(pos);
      if (rand(SPARKLE_CHANCE) === 0) this.#sparkle(pos);
    }
  }

  #strike(hero: { x: number; y: number; z: number }): void {
    // Only x is jittered in the original, and only over ±150 MU: the strike is
    // meant to land on the hero, not near them.
    this.#flashPosition.x =
      hero.x + (rand(THUNDER_SPREAD_MU * 2) - THUNDER_SPREAD_MU) / TILE_CM;
    this.#flashPosition.y = hero.y;
    this.#flashPosition.z = hero.z;

    // Lit on the frame it is rolled (the source is `instant`), and it decays
    // and removes itself — the lighting layer owns the flash from here.
    strikeThunder(this.#scene, this.#flashPosition);
  }

  #sparkle(hero: { x: number; y: number; z: number }): void {
    if (this.#sparkles.length === 0) return;

    const sparkle = this.#sparkles[this.#sparkleCursor % this.#sparkles.length];

    this.#sparkleCursor++;

    sparkle.life = SPARKLE_LIFE_TICKS;

    // MU x/y are the ground plane and MU z is up, so the -1000 drop puts the
    // glow ten tiles below the hero — out in the void the islands float over.
    sparkle.flare.moveTo(
      hero.x +
        (rand(SPARKLE_SPREAD_MU * 2) - SPARKLE_SPREAD_MU) / TILE_CM,
      hero.y - SPARKLE_DROP_MU / TILE_CM,
      hero.z + (rand(SPARKLE_SPREAD_MU * 2) - SPARKLE_SPREAD_MU) / TILE_CM
    );
  }

  #ageSparkles(): void {
    for (const sparkle of this.#sparkles) {
      if (sparkle.life <= 0) continue;

      sparkle.life -= 1;

      // Up and back down over the life, so a glow arrives and leaves instead
      // of snapping on at full brightness.
      const t = sparkle.life / SPARKLE_LIFE_TICKS;

      sparkle.flare.setLuminosity(Math.sin(Math.PI * t));
    }
  }

  dispose(): void {
    this.#disposed = true;

    if (this.#observer) {
      this.#scene.onBeforeRenderObservable.remove(this.#observer);
      this.#observer = null;
    }

    for (const sparkle of this.#sparkles) sparkle.flare.dispose();
    this.#sparkles.length = 0;
  }
}
