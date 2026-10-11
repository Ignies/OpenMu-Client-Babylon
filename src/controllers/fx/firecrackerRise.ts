import { Vector3, type Scene } from '../render/babylon/exports';
import { CM, TICK, delay, emitBurst, type ParticleRecipe, type RGB } from './core';
import { TEX } from './recipes';
import { playSfx } from '../sound/sfx';
import { lighting } from '../lighting';
import type { LightRecipe } from '../lighting/lightSource';

/**
 * BITMAP_FIRECRACKERRISE, the fireworks of a Battle Soccer score (`ReceiveSoccerScore`,
 * WSclient.cpp:8172-8179): on the hero's square at a flat 100 cm (`o->Position[2] = 100.0f`,
 * ZzzEffect.cpp:2893-2897; the stadium's ground is about 224 cm, so the rockets climb out of it),
 * for 75 ticks, every fifth of which fires a BITMAP_FIRECRACKER rocket one time in three
 * (MoveHandlers.cpp:4898-4906).
 *
 * A rocket (ZzzEffect.cpp:2898-2907, MoveHandlers.cpp:4908-4928) climbs `(rand() % 9 - 4,
 * rand() % 9 - 4, 26)` cm a tick for 12 ticks, leaving a sub -1 spark and a ground light each tick,
 * and on its last bursts into 80 sparks of one random sub and colour with SOUND_FIRECRACKER2. A spark
 * (ZzzEffectParticle.cpp:2792-2808, :7475) flies `(rand() % (15 + sub) - (15 + sub) / 2) * 0.15` cm a
 * tick each way plus 10 up, falls 0.5 cm a tick per tick and lives 50 ticks. It is drawn (:9165-9186)
 * as a streak of 22-29 Fire04 sprites back along its velocity, its colour turning through the
 * channels as `LifeTime / 4 + SubType` falls: here one stretched card eased from the colour it is
 * born with to the one it dies with.
 */

const ticks = (n: number) => n * TICK;
const randInt = (n: number) => Math.floor(Math.random() * n);

const RISE_HEIGHT_CM = 100;
/** LifeTime 75: a roll at 75, 70, ..., 5. */
const LAUNCHES = 15;
const LAUNCH_EVERY = 5;
const ROCKET_TICKS = 12;
const CLIMB_CM = 26;
const SPARKS = 80;
const SPARK_SUBS = 30;
const SPARK_TICKS = 50;
/** Fire04 is 64 px; RenderSprite's edge is the texel width x Scale cm. */
const FIRE04_PX = 64;
/** The streak runs about 2.5 ticks of flight (22-29 sprites, 0.1 of the velocity apart) at ~10 cm a tick. */
const STREAK = 4;

/** Sub -1: LifeTime 2, Scale 0.25, white, where the rocket is. */
const TRAIL: ParticleRecipe = {
  texture: TEX.fire4,
  colour: [1, 1, 1],
  size: FIRE04_PX * 0.25 * CM,
  sizeJitter: 0,
  life: ticks(2),
  lifeJitter: 0,
  box: [0, 0, 0],
  power: 0,
  fade: [[0, 1], [1, 0.5]],
  realSeconds: true,
};

/** `AddTerrainLight(x, y, Luminosity * (0.4, 0.3, 0.2), 1)`, `Luminosity = (rand() % 4 + 7) * 0.1`, dimming its last 5 ticks. */
const ROCKET_LIGHT: LightRecipe = {
  color: [0.4, 0.3, 0.2],
  range: 1,
  flicker: { min: 0.7, max: 1, steps: 4 },
  seconds: ticks(ROCKET_TICKS),
  release: ticks(5),
};

/** The spark's colour at `t = LifeTime / 4 + SubType`: each channel eased toward the next (ZzzEffectParticle.cpp:9170-9182). */
function turned(light: RGB, t: number): RGB {
  const c = Math.floor(t / 10);
  const f = (t % 10) / 10;
  const at = (k: number) => light[(k + c) % 3] * (1 - f) + light[(k + c + 1) % 3] * f;
  return [at(0), at(1), at(2)];
}

/** One recipe per colour roll and sub (12 x 30 at most), made the first time it bursts. */
const bursts = new Map<number, ParticleRecipe>();

function burstRecipe(red: number, green: number, sub: number): ParticleRecipe {
  const key = (red * 4 + green) * SPARK_SUBS + sub;
  let recipe = bursts.get(key);
  if (!recipe) {
    const light: RGB = [red * 0.3 + 0.4, green * 0.1, 0];
    const size = 15 + sub;
    const lo = -Math.floor(size / 2) * 0.15;
    const hi = (size - 1 - Math.floor(size / 2)) * 0.15;
    recipe = {
      texture: TEX.fire4,
      colour: turned(light, Math.floor(SPARK_TICKS / 4) + sub),
      colourEnd: turned(light, sub),
      size: FIRE04_PX * 0.1 * CM,
      sizeJitter: 0,
      life: ticks(SPARK_TICKS),
      lifeJitter: 0,
      box: [0, 0, 0],
      // Directions in cm a tick (MU x, up, MU y), at one cm a tick of power.
      dir1: [lo, 10 + lo, lo],
      dir2: [hi, 10 + hi, hi],
      power: CM / TICK,
      powerJitter: 0,
      gravity: (-0.5 * CM) / TICK / TICK,
      stretch: STREAK,
      // Full light until its last 10 ticks: `min(LifeTime, 10) * 0.001`.
      fade: [[0, 1], [0.8, 1], [1, 0]],
      capacity: SPARKS * 4,
      realSeconds: true,
    };
    bursts.set(key, recipe);
  }
  return recipe;
}

/** The fireworks on the square (`tileX`, `tileY`): its centre, 100 cm up. */
export function spawnFirecrackerRise(scene: Scene, tileX: number, tileY: number): void {
  const from = new Vector3(tileX + 0.5, RISE_HEIGHT_CM * CM, tileY + 0.5);
  for (let i = 0; i < LAUNCHES; i++) {
    if (randInt(3) === 0) delay(ticks(i * LAUNCH_EVERY), () => launchRocket(scene, from));
  }
}

function launchRocket(scene: Scene, from: Vector3): void {
  const dx = (randInt(9) - 4) * CM;
  const dz = (randInt(9) - 4) * CM;
  const at = from.clone();
  lighting.flash(scene, ROCKET_LIGHT, { position: at });
  // Each tick: where it has climbed to, the burst on the last, the spark it leaves.
  const step = (t: number) => {
    at.set(from.x + dx * t, from.y + CLIMB_CM * CM * t, from.z + dz * t);
    if (t === ROCKET_TICKS - 1) burst(scene, at);
    emitBurst(scene, TRAIL, at, 1);
  };
  step(0);
  for (let t = 1; t < ROCKET_TICKS; t++) delay(ticks(t), () => step(t));
}

function burst(scene: Scene, at: Vector3): void {
  const sub = randInt(SPARK_SUBS);
  emitBurst(scene, burstRecipe(randInt(3), randInt(4), sub), at, SPARKS);
  playSfx('Sound/eFirecracker2', { x: at.x, z: at.z });
}
