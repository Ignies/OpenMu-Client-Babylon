import { TILE_CM } from '../../common/terrain/consts';
import type { Observer, Scene } from '../../libs/babylon/exports';
import type { World } from '../../ecs/world';
import { lighting } from '../../lighting';
import { PRIORITY_TORCH, type LightRecipe, type LightSource } from '../../lighting/lightSource';

/**
 * The storm over Devil Square: the one world-level mover the map runs.
 *
 * `MoveObject` opens with a block this world alone takes
 * (ZzzObject.cpp:3630-3644, written against the literal `9` rather than
 * `WD_9DEVILSQUARE`, which is why it does not turn up in a grep for the
 * enum):
 *
 *     if (gMapManager.WorldActive == 9)
 *     {
 *         if ((int)WorldTime % 4000 < 1000)
 *             if (rand_fps_check(100))
 *             {
 *                 float Luminosity = (float)(rand() % 12 + 4) * 0.1f;
 *                 Vector(L * 0.2f, L * 0.3f, L * 0.5f, Light);
 *                 AddTerrainLight(Hero.x + rand() % 1200 - 600,
 *                                 Hero.y + rand() % 1200 - 600,
 *                                 Light, 12, PrimaryTerrainLight);
 *             }
 *         PlayBuffer(SOUND_RAIN01, NULL, true);
 *     }
 *
 * One second in every four, the ground around the hero flickers cold blue -
 * lightning behind the cloud on the map where it never stops raining. It is
 * hero-relative and has no emitter to hang off, so it lives here rather than
 * in a per-type table, the way `maps/icarus/sky.ts` holds `MoveHeavenThunder`.
 *
 * The rain loop in the same block is `Sound/aRain` (`SOUND_RAIN01`,
 * ZzzOpenData.cpp:4744), already a bed in `sound/ambientBeds.ts`. The thunder
 * clap next to it is commented out in the original, so there is no sound.
 */

/** 25 Hz, the rate `rand_fps_check(n)` counts its one-in-n against. */
const TICKS_PER_SECOND = 25;

/** `(int)WorldTime % 4000 < 1000`. */
const PERIOD_MS = 4000;
const WINDOW_MS = 1000;

/** `Hero->Position + rand() % 1200 - 600`, on both ground axes. */
const SPREAD_MU = 600;

/** `AddTerrainLight(..., 12, PrimaryTerrainLight)`. */
const RANGE_TILES = 12;

/** `Luminosity = (rand() % 12 + 4) * 0.1f` - 0.4 to 1.5 in twelve steps. */
const LUMI_MIN = 0.4;
const LUMI_STEP = 0.1;
const LUMI_STEPS = 12;

/** `Vector(Luminosity * 0.2f, Luminosity * 0.3f, Luminosity * 0.5f, Light)`. */
const FLASH_R = 0.2;
const FLASH_G = 0.3;
const FLASH_B = 0.5;

/**
 * How long one flash lives, in seconds.
 *
 * The original's is a single frame: `PrimaryTerrainLight` is rebuilt from the
 * bake every frame, so the cone is gone on the next one. Reproducing that
 * literally at 60-144 fps gives a one-frame blip that reads as a dropped
 * frame rather than as lightning, so each flash is held to a wall-clock
 * decay instead - four reference ticks, instant on and linear out. Same
 * argument, same shape and nearly the same number as `lighting/sky.ts`'s
 * Icarus strike.
 */
const FLASH_SECONDS = 0.16;

/**
 * Ticks between flashes inside the window, and how many may overlap.
 *
 * Neither is the original's, because the original's rate is an accident of
 * the object list: the roll sits inside `MoveObject`, so it runs once per
 * *visible object* per frame, and Devil Square puts 564 of them on the map.
 * At one in a hundred each that is a couple of cones a tick - forty-odd
 * one-frame flashes per window, summing into a broad wash whose brightness
 * stutters. Forty light sources a second is not something to reproduce
 * literally, and it is not what the player sees either.
 *
 * What is kept is the shape: discrete strikes at random points within the
 * original's +/-6 tiles, at the original's colour and footprint, often
 * enough that they overlap. One roll in two over a 25-tick window is about
 * twelve strikes, two or three of them alight at any moment.
 */
const FLASH_CHANCE = 2;
const MAX_CONCURRENT = 2;

/**
 * What the point sink is worth here.
 *
 * The original has no per-pixel light at all - `AddTerrainLight` writes the
 * tile map and nothing else - but on lighting tiers >= 1 the pool is what
 * carries a tile emitter onto the ground per pixel, so the flash has to
 * register one to be seen there. It is given the event gain rather than a
 * torch's, and the map's own priority rather than an event's: a squall is
 * ambience, and it must never take a pool slot off a skill flash in the
 * middle of a wave.
 */
const FLASH_GAIN = 0.35;

const rand = (n: number) => Math.floor(Math.random() * n);

function flashRecipe(lumi: number): LightRecipe {
  return {
    color: [lumi * FLASH_R, lumi * FLASH_G, lumi * FLASH_B],
    range: RANGE_TILES,
    pointRange: RANGE_TILES,
    gain: FLASH_GAIN,
    priority: PRIORITY_TORCH,
    instant: true,
    seconds: FLASH_SECONDS,
    release: FLASH_SECONDS,
  };
}

export class DevilSquareStorm {
  #observer: Observer<Scene> | null = null;

  #scene: Scene;

  #world: World;

  #tickDue = 0;

  /** Wall clock in the original's units, so the 4 s cycle is its own. */
  #elapsedMs = 0;

  #strikes: LightSource[] = [];

  constructor(world: World) {
    this.#world = world;
    this.#scene = world.scene;

    this.#observer = this.#scene.onBeforeRenderObservable.add(() =>
      this.#update()
    );
  }

  #update(): void {
    const deltaMs = this.#scene.getEngine().getDeltaTime();

    this.#elapsedMs += deltaMs;
    this.#tickDue += (deltaMs / 1000) * TICKS_PER_SECOND;

    // A long stall must not fire a burst on the frame it ends.
    if (this.#tickDue > 4) this.#tickDue = 4;

    const hero = this.#world.playerEntity;
    if (!hero) {
      this.#tickDue = 0;
      return;
    }

    const pos = hero.transform.pos;

    while (this.#tickDue >= 1) {
      this.#tickDue -= 1;

      if (this.#strikes.length > 0) {
        this.#strikes = this.#strikes.filter(s => s.alive);
      }

      if (this.#elapsedMs % PERIOD_MS >= WINDOW_MS) continue;
      if (this.#strikes.length >= MAX_CONCURRENT) continue;
      if (rand(FLASH_CHANCE) !== 0) continue;

      this.#strike(pos);
    }
  }

  #strike(hero: { x: number; y: number; z: number }): void {
    const lumi = LUMI_MIN + rand(LUMI_STEPS) * LUMI_STEP;

    // MU x/y are the ground plane and the client's are x/z; the jitter is on
    // both of them, unlike Icarus's strike, which only moves along x.
    const at = {
      x: hero.x + (rand(SPREAD_MU * 2) - SPREAD_MU) / TILE_CM,
      y: hero.y,
      z: hero.z + (rand(SPREAD_MU * 2) - SPREAD_MU) / TILE_CM,
    };

    this.#strikes.push(lighting.flash(this.#scene, flashRecipe(lumi), { position: at }));
  }

  dispose(): void {
    if (this.#observer) {
      this.#scene.onBeforeRenderObservable.remove(this.#observer);
      this.#observer = null;
    }

    for (const strike of this.#strikes) strike.dispose();
    this.#strikes.length = 0;
  }
}
