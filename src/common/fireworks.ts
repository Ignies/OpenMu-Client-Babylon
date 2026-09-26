import { Vector3, type Scene } from '../libs/babylon/exports';
import { delay, effects, fxNow } from '../effects';
import { CM, TICK, type ParticleRecipe, type PointSource, type RGB } from '../effects/core';
import { spawnModel } from '../effects/model';
import { EXPLOSION_CELLS, TEX } from '../effects/recipes';
import { playSfx } from '../libs/sfx';
import { Store } from '../store';

/**
 * The GM fireworks and the Box of Luck drop burst: `ReceiveServerCommand`
 * case 0 and its Christmas twin 59 (WSclient.cpp:8362, :8521), both
 * `CreateEffect(BITMAP_FIRECRACKER0001, ...)` with SubType 0 / 1.
 *
 * FIRECRACKER0001 fires five BITMAP_JOINT_SPIRIT sub 25 rockets
 * (MoveHandlers.cpp:4929); each rocket climbs trailing Shiny01 and bursts
 * into FIRECRACKER0002 at LifeTime 10 (ZzzEffectJoint.cpp:4173). The burst
 * (ZzzEffect.cpp:2915) is a mono explosion, two spark showers, a glitter
 * cloud, a shock flash and the firecracker sound, then FIRECRACKER0003 stars
 * pop around it for 30 ticks (MoveHandlers.cpp:4945). The Christmas one also
 * throws a candy star and two gifts.
 */

const ticks = (n: number) => n * TICK;
const cm = (n: number) => n * CM;
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

/** FIRECRACKER0001 LifeTime 31: a rocket leaves at LifeTime 31, 24, 17, 9 and 1. */
const LAUNCH_TICKS: readonly number[] = [0, 7, 14, 22, 30];
/** `rand() % 200 - 100` cm around the tile. */
const LAUNCH_SPREAD_CM = 100;

/** Joint sub 25: `Vector(0.9, 0.8, 1.0, o->Light)` (ZzzEffectJoint.cpp:931). */
const ROCKET_LIGHT: RGB = [0.9, 0.8, 1];
/**
 * Up per tick while it climbs: `Velocity` 9 along the -90 pitch plus
 * `Position[2] += Velocity` in the sub 25 move; only the first is left while it fades.
 */
const CLIMB_CM = 18;
const COAST_CM = 9;
/** `rand() % 16 - 8` cm of sideways wobble a climbing tick. */
const WOBBLE_CM = 8;
/** LifeTime 26 counts down; the burst is at LifeTime 10, the fade after it. */
const BURST_TICK = 16;
/** `Light /= 1.45` a tick after the burst, dead under 0.2: five ticks. */
const FADE_PER_TICK = 1 / 1.45;
const ROCKET_TICKS = 21;
/** `Scale += 3` a tick from 1: the tail is laid 1 cm wide at the ground and 49 cm at the burst. */
const ROCKET_WIDTH_CM = 1 + 3 * BURST_TICK;

/** RenderSprite edge = texel width x Scale cm. */
const FLARE_PX = 64;
const SHOCK_PX = 128;
const EXPLOSION_PX = 256;
const STAR_PX = 256;
const SPARK_PX = 32;
const SHINY_PX = 16;

/** BITMAP_SPARK+1 sub 27: 12 cm a tick in any direction, `Light / 1.02`, `Scale / 1.03` (ZzzEffectParticle.cpp:2377). */
const SPARKS_OUT: ParticleRecipe = {
  texture: TEX.spark3,
  colour: [1, 1, 1],
  size: cm(SPARK_PX * 1.5),
  sizeJitter: 0.33,
  life: ticks(20),
  lifeJitter: 0.5,
  power: cm(12) / TICK,
  powerJitter: 0,
  dir1: [-1, -1, -1],
  dir2: [1, 1, 1],
  endScale: 0.6,
  fade: [[0, 1], [0.9, 0.7], [1, 0]],
};

/**
 * Sub 28: up at `Gravity * 0.5` = 10 cm a tick losing 0.75 a tick, sideways up to
 * 5 cm a tick, `Light / 1.02`, `Scale / 1.01`.
 */
const SPARKS_FOUNTAIN: ParticleRecipe = {
  texture: TEX.spark3,
  colour: [1, 1, 1],
  size: cm(SPARK_PX * 1.5),
  sizeJitter: 0.33,
  life: ticks(30),
  lifeJitter: 0.33,
  power: cm(10) / TICK,
  powerJitter: 0.1,
  dir1: [-0.5, 1, -0.5],
  dir2: [0.5, 1, 0.5],
  gravity: -cm(0.75) / TICK / TICK,
  endScale: 0.8,
  fade: [[0, 1], [0.8, 0.6], [1, 0]],
};

/**
 * BITMAP_SHINY sub 6 (ZzzEffectParticle.cpp:2545, :7128): 60 motes of a random
 * `0.3..1` colour thrown at 14 cm a tick, braked `/ 1.04` a tick and sinking,
 * 60-69 ticks. One particle system is one colour, so the random tint is a
 * small palette the motes are shared over.
 */
const GLITTER_COLOURS = 6;
const GLITTER_COUNT = 60;
const glitter: ParticleRecipe[] = Array.from({ length: GLITTER_COLOURS }, () => ({
  texture: TEX.shiny,
  colour: [rand(0.3, 1), rand(0.3, 1), rand(0.3, 1)] as RGB,
  size: cm(SHINY_PX * 0.7),
  sizeJitter: 0.3,
  life: ticks(65),
  lifeJitter: 0.1,
  // The braked throw averages ~1.4 tiles/s over the life; the sink is `Gravity * 0.1` cm.
  power: 1.4,
  dir1: [-1, -1, -1],
  dir2: [1, 1, 1],
  gravity: -0.3,
  fade: [[0, 1], [0.7, 0.6], [1, 0]],
}));

/** FIRECRACKER0003: `rand_fps_check(5)` a tick over the burst's 30, within `rand() % 300 - 150` cm. */
const STAR_TICKS = 30;
const STAR_CHANCE = 1 / 5;
const STAR_SPREAD_CM = 150;
/** Frames 0..6 over the first 8 of 15 ticks, then frame 6 sinks 1 cm, `Light / 1.05`, `Scale * 1.02`. */
const STAR_FRAMES = [1, 2, 3, 4, 5, 6, 7].map(n => `Effect/firecracker000${n}.OZJ`);
const STAR_LIFE_TICKS = 15;
const STAR_FLIP_TICKS = 8;
const STAR_FADE_PER_TICK = 1 / 1.05;

/** MODEL_HALLOWEEN_CANDY_STAR sub 1 and MODEL_XMAS_EVENT_BOX..SOCKS (ZzzEffect.cpp:3772, :3792). */
const CANDY_STAR = 'Skill/hstar.glb';
const GIFTS = ['Skill/xmasebox.glb', 'Skill/xmasecandy.glb', 'Skill/xmasetree.glb', 'Skill/xmaseyangbal.glb'];

/** The Christmas firecracker loads with MAX_CHANNEL and no 3D: every burst rings at full volume. */
const BURST_SOUND_CHANNELS = 4;

export function spawnFireworks(scene: Scene, at: Vector3, christmas: boolean): void {
  for (const tick of LAUNCH_TICKS) {
    const from = at.clone();
    from.x += cm(rand(-LAUNCH_SPREAD_CM, LAUNCH_SPREAD_CM));
    from.z += cm(rand(-LAUNCH_SPREAD_CM, LAUNCH_SPREAD_CM));
    delay(ticks(tick), () => launchRocket(scene, from, christmas));
  }
}

function launchRocket(scene: Scene, from: Vector3, christmas: boolean): void {
  // The head is stepped a tick at a time like the original and eased between ticks.
  const prev = from.clone();
  const cur = from.clone();
  let stepped = 0;
  const t0 = fxNow();
  const head: PointSource = out => {
    const k = (fxNow() - t0) / TICK;
    while (stepped < Math.min(k, ROCKET_TICKS)) {
      prev.copyFrom(cur);
      if (stepped < BURST_TICK) {
        cur.x += cm(rand(-WOBBLE_CM, WOBBLE_CM));
        cur.z += cm(rand(-WOBBLE_CM, WOBBLE_CM));
        cur.y += cm(CLIMB_CM);
      } else {
        cur.y += cm(COAST_CM);
      }
      stepped++;
    }
    return Vector3.LerpToRef(prev, cur, Math.min(1, Math.max(0, k - stepped + 1)), out);
  };
  const intensity = (t: number) => (t < ticks(BURST_TICK) ? 1 : FADE_PER_TICK ** (t / TICK - BURST_TICK));

  effects.spawn('joint', scene, from, {
    head,
    maxTails: 30,
    width: cm(ROCKET_WIDTH_CM),
    taper: { nose: 1, span: 0.01, hold: 0, falloff: 1 },
    seconds: ticks(ROCKET_TICKS),
    colour: ROCKET_LIGHT,
    texture: TEX.shiny,
    intensity,
  });
  // The head's own sprites, redrawn every tick: BITMAP_LIGHT 0.5 and BITMAP_DS_SHOCK 0.15.
  const tail = (ROCKET_TICKS - BURST_TICK) / ROCKET_TICKS;
  effects.spawn('sprite', scene, from, { texture: TEX.flare, colour: ROCKET_LIGHT, size: cm(FLARE_PX * 0.5), seconds: ticks(ROCKET_TICKS), follow: head, fadeTail: tail });
  effects.spawn('sprite', scene, from, { texture: TEX.shockwave, colour: ROCKET_LIGHT, size: cm(SHOCK_PX * 0.15), seconds: ticks(ROCKET_TICKS), follow: head, fadeTail: tail });

  delay(ticks(BURST_TICK), () => burst(scene, head(new Vector3()), christmas));
}

function burst(scene: Scene, at: Vector3, christmas: boolean): void {
  effects.spawn('sprite', scene, at, {
    texture: TEX.explosionMono,
    colour: ROCKET_LIGHT,
    size: cm(EXPLOSION_PX * 0.6),
    seconds: ticks(20),
    cells: EXPLOSION_CELLS,
    fadeTail: 0.1,
  });
  // The mono explosion particle rings SOUND_EXPLOTION01 as it is made (ZzzEffectParticle.cpp:2477).
  playSfx('Sound/eExplosion', { x: at.x, z: at.z }, { channels: 1 });

  effects.spawn('particles', scene, at, { recipe: SPARKS_OUT, count: 60 });
  effects.spawn('particles', scene, at, { recipe: SPARKS_FOUNTAIN, count: 30 });
  for (let i = 0; i < GLITTER_COLOURS; i++) {
    effects.spawn('particles', scene, at, { recipe: glitter[i], count: GLITTER_COUNT / GLITTER_COLOURS });
  }

  // One frame of DS_SHOCK within 50 cm, `rand() % 10 * 0.1 + 1.5`.
  const flash = at.clone();
  flash.x += cm(rand(-50, 50));
  flash.z += cm(rand(-50, 50));
  effects.spawn('sprite', scene, flash, {
    texture: TEX.shockwave,
    colour: ROCKET_LIGHT,
    size: cm(SHOCK_PX * rand(1.5, 2.4)),
    seconds: ticks(1),
    fadeTail: 0,
  });

  if (christmas) {
    throwTumbler(scene, at, CANDY_STAR, 2 + rand(-0.1, 0.1), rand(40, 50), rand(10, 20), 0);
    for (let i = 0; i < 2; i++) {
      const gift = (Math.random() * GIFTS.length) | 0;
      const scale = 0.7 + rand(-0.1, 0.1) + (gift === 0 ? 0.3 : 0);
      throwTumbler(scene, at, GIFTS[gift], scale, rand(50, 60), rand(15, 20), 3);
    }
  }

  playSfx('Sound/xmas/Christmas_Fireworks01', null, { channels: BURST_SOUND_CHANNELS });

  for (let i = 0; i < STAR_TICKS; i++) {
    if (Math.random() < STAR_CHANCE) delay(ticks(i), () => star(scene, at));
  }
}

function star(scene: Scene, around: Vector3): void {
  const at = around.clone();
  at.x += cm(rand(-STAR_SPREAD_CM, STAR_SPREAD_CM));
  at.z += cm(rand(-STAR_SPREAD_CM, STAR_SPREAD_CM));
  const scale = 0.5 + ((Math.random() * 5) | 0) * 0.1;
  const hold = STAR_LIFE_TICKS - STAR_FLIP_TICKS;
  effects.spawn('sprite', scene, at, {
    texture: STAR_FRAMES[0],
    frames: { textures: STAR_FRAMES, until: STAR_FLIP_TICKS / STAR_LIFE_TICKS },
    colour: [rand(0.3, 1), rand(0.3, 1), rand(0.3, 1)],
    size: cm(STAR_PX * scale),
    seconds: ticks(STAR_LIFE_TICKS),
    rotation: Math.random() * Math.PI * 2,
    // Only the held last frame sinks, fades and swells; spread over the life it is close enough.
    rise: -cm(1) / TICK * (hold / STAR_LIFE_TICKS),
    decay: STAR_FADE_PER_TICK ** (hold / STAR_LIFE_TICKS),
    grow: 1.02 ** hold,
    fadeTail: 0.2,
  });
}

/**
 * A model thrown out of the burst that spins about one random axis 20 degrees a
 * tick, rises `Gravity * 0.5` cm a tick losing 1.5, drifts along `Direction` and
 * bounces off the ground at 0.3 (Move_MODEL_HALLOWEEN_CANDY_BLUE / _XMAS_EVENT_BOX).
 */
function throwTumbler(
  scene: Scene,
  at: Vector3,
  model: string,
  scale: number,
  lifeTicks: number,
  gravity: number,
  floorCm: number
): void {
  const world = Store.world;
  const angle: [number, number, number] = [rand(0, 360), rand(0, 360), rand(0, 360)];
  const axis = (Math.random() * 3) | 0;
  // `((rand() % 60 - 30) * 0.1, same, -1) * 1.5` turned by that random angle: a random heading.
  const speed = cm(Math.hypot(rand(-4.5, 4.5), rand(-4.5, 4.5), 1.5));
  const drift = new Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().scaleInPlace(speed);
  const pos = at.clone();
  let g = gravity;
  let life = lifeTicks;
  let last = fxNow();
  let turn: ((a: readonly [number, number, number]) => void) | null = null;
  const handle = spawnModel(scene, pos, {
    model,
    scale,
    seconds: ticks(lifeTicks),
    angle,
    loop: false,
    fadeTail: 0.1,
    native: { light: [1, 1, 1] },
    until: () => life <= 0,
    follow: out => {
      const now = fxNow();
      const k = (now - last) / TICK;
      last = now;
      if (k > 0) {
        pos.y += cm(g * 0.5) * k;
        g -= 1.5 * k;
        const floor = (world ? world.getTerrainHeight(pos.x, pos.z) : -Infinity) + cm(floorCm);
        if (pos.y < floor) {
          pos.y = floor;
          g = -g * 0.3;
          life -= 2 * k;
        }
        pos.addInPlace(drift.scale(k));
        angle[axis] += 20 * k;
        turn?.(angle);
        life -= k;
      }
      return out.copyFrom(pos);
    },
  });
  turn = a => handle.setAngle(a);
}
