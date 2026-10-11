import { defineSkill } from '@/controllers/skills/define';
import { bearing, monsterOf, placeBodyLight, releaseSound } from '../_shared';
import { TEX } from '@/controllers/fx/recipes';
import { entityGone, entityPos, fxNow, type ParticleRecipe, type PointSource } from '@/controllers/fx/core';
import { Step, TICK, cm, forwardOf, onRelease, particles, perTick, seq, sprite, ticks } from '@/controllers/skills/visuals';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';

import { type LightRecipe } from '@/controllers/lighting/lightSource';
import { effectLight } from '@/controllers/lighting/recipes';

/**
 * The BITMAP_ENERGY particle a tick at the ball (ZzzEffect.cpp:6879; ZzzEffectParticle.cpp:723-726):
 * Thunder01 x 0.6-1.3, random rotation turning 20 deg a tick, LT 2, so drawn for one tick at saturated light.
 */
const ENERGY_BALL_CORE: ParticleRecipe = {
  texture: TEX.thunder,
  colour: [1, 1, 1],
  size: 0.61,
  sizeJitter: 0.37,
  life: 0.04,
  lifeJitter: 0,
  box: [0, 0, 0],
  power: 0,
  powerJitter: 0,
  gravity: 0,
  spin: 8.7,
  fade: [
    [0, 1],
    [1, 1],
  ],
  blend: 'add',
  capacity: 64,
  realSeconds: true,
};

/** The BITMAP_SPARK+1 sub0 a tick at the ball: Spark03 at Scale 4, down to 3.5 by its one drawn tick (ZzzEffectParticle.cpp:6613-6616). */
const ENERGY_BALL_STAR: ParticleRecipe = {
  ...ENERGY_BALL_CORE,
  texture: TEX.spark3,
  size: 1.12,
  sizeJitter: 0,
  spin: 0,
  upright: true,
};

/** CheckTargetRange's BITMAP_SPARK+1 sub1 (ZzzEffect.cpp:283-285): Scale 6, down to 4 by its one drawn tick, white. */
const ENERGY_BALL_POP: ParticleRecipe = {
  ...ENERGY_BALL_STAR,
  size: 1.28,
};

/** The Energy Ball's halo on the graded tiers: a blue flare under each tick's cards, drawn one tick with them. */
const ENERGY_BALL_GLOW: ParticleRecipe = {
  ...ENERGY_BALL_CORE,
  texture: TEX.flare,
  colour: [0.15, 0.35, 0.8],
  size: 1.4,
  sizeJitter: 0,
  // A shade under the tick and dimming, so the last tick's halo is gone or faint when the next one is laid.
  life: 0.032,
  spin: 0,
  fade: [
    [0, 1],
    [1, 0.4],
  ],
};

/** The Energy Ball's wake: small blue glints shed along its path, falling behind it as they die (flare01: Spark02's art is yellow). */
const ENERGY_BALL_WAKE: ParticleRecipe = {
  texture: TEX.flare,
  colour: [0.65, 0.85, 1],
  colourEnd: [0.15, 0.3, 1],
  size: 0.14,
  sizeJitter: 0.4,
  life: 0.35,
  lifeJitter: 0.3,
  box: [0.1, 0.1, 0.1],
  dir1: [-1, -0.5, -1],
  dir2: [1, 0.8, 1],
  power: 0.9,
  powerJitter: 0.4,
  gravity: -1.5,
  spin: 4,
  capacity: 256,
  realSeconds: true,
};

/** The Energy Ball's pop: blue-white sparks flung out of the Spark03 flash. */
const ENERGY_BALL_BURST: ParticleRecipe = {
  ...ENERGY_BALL_WAKE,
  colour: [0.8, 0.92, 1],
  size: 0.12,
  life: 0.4,
  box: [0.05, 0.05, 0.05],
  dir1: [-1, -0.6, -1],
  dir2: [1, 1, 1],
  power: 3.2,
  settle: 0.6,
  gravity: -1,
};

/** Monsters whose Energy Ball the original draws nothing for, and plays no sound (ZzzCharacter.cpp:5089-5122). */
const ENERGY_BALL_UNDRAWN = new Set([37, 46, 61, 66, 69, 70, 73, 75, 77, 87, 89, 93, 95, 99, 112, 116, 118, 122, 124, 128, 130, 141, 143, 163, 165, 167, 169, 171, 173, 293, 303, 427]);
const ENERGY_BALL_TICKS = 20;

/** What the graded tiers add to the Energy Ball: streams riding the ball, and a step run at the ball where it pops. */
interface EnergyBallLook {
  streams: readonly { recipe: ParticleRecipe; rate: number }[];
  pop: Step;
}

/**
 * 17 Energy Ball (ZzzCharacter.cpp:5087-5143): at the release, the invisible BITMAP_ENERGY mover leaves the
 * caster's feet +100 cm along the bearing to the target, 60 cm a tick for LT 20 (ZzzEffect.cpp:829-835).
 * Each tick a Thunder01 card and a Spark03 star at the ball, each drawn one tick, and the blue light
 * (:6874-6885). CheckTargetRange: within 100 cm (2D) of the live target it dies in one BITMAP_SPARK+1 sub1,
 * flung 50 cm in a random direction (:244-285). A ball whose target is gone flies on. SOUND_MAGIC.
 */
const energyBall = (look?: EnergyBallLook): Step => (_at, c) => {
  onRelease(c, () => {
    if (entityGone(c.caster) || ENERGY_BALL_UNDRAWN.has(monsterOf(c.caster))) return;
    const from = entityPos(c.caster, cm(100), new Vector3());
    const f = forwardOf(bearing(c, from));
    const speed = perTick(60);
    const target = c.target && !entityGone(c.target) ? c.target : null;
    const t0 = fxNow();
    const flight: PointSource = out => {
      const d = Math.min(fxNow() - t0, ticks(ENERGY_BALL_TICKS)) * speed;
      return out.set(from.x + f.x * d, from.y, from.z + f.z * d);
    };
    const head = from.clone();
    const light = lighting.skillLand(c.scene, 17, from, out => {
      flight(head);
      out.x = head.x;
      out.y = head.y;
      out.z = head.z;
    });
    const feet = new Vector3();
    let seen = -1;
    let over = false;
    // CheckTargetRange once a tick, on the tick's own position.
    const done = (): boolean => {
      const n = Math.floor((fxNow() - t0) / TICK);
      while (!over && seen < n) {
        seen++;
        if (seen >= ENERGY_BALL_TICKS) over = true;
        else if (target && !entityGone(target)) {
          entityPos(target, 0, feet);
          const d = seen * cm(60);
          const x = from.x + f.x * d;
          const z = from.z + f.z * d;
          if ((x - feet.x) ** 2 + (z - feet.z) ** 2 <= 1) {
            over = true;
            const yaw = Math.random() * Math.PI * 2;
            const up = Math.asin(Math.random() * 2 - 1);
            const pop = new Vector3(x + Math.cos(up) * Math.sin(yaw) * cm(50), from.y + Math.sin(up) * cm(50), z + Math.cos(up) * Math.cos(yaw) * cm(50));
            effects.spawn('particles', c.scene, pop, { recipe: ENERGY_BALL_POP, count: 1 });
            look?.pop(new Vector3(x, from.y, z), c);
          }
        }
        if (over) light?.dispose();
      }
      return over;
    };
    effects.spawn('particles', c.scene, from, { recipe: ENERGY_BALL_STAR, rate: 25, seconds: ticks(ENERGY_BALL_TICKS), follow: flight, until: done });
    effects.spawn('particles', c.scene, from, { recipe: ENERGY_BALL_CORE, rate: 25, seconds: ticks(ENERGY_BALL_TICKS), follow: flight, until: done });
    if (look) for (const o of look.streams) effects.spawn('particles', c.scene, from, { ...o, seconds: ticks(ENERGY_BALL_TICKS), follow: flight, until: done });
    releaseSound('Sound/sMagic')(from, c);
  });
};

/** Energy Ball on the graded tiers: a held blue glow and a spark wake on the ball; its pop throws sparks, a flash and a light. */
const ENERGY_BALL_LOOK: EnergyBallLook = {
  // The glow is laid with the tick's cards, at their rate, so it sits on them rather than on the moving ball.
  streams: [
    { recipe: ENERGY_BALL_GLOW, rate: 25 },
    { recipe: ENERGY_BALL_WAKE, rate: 40 },
  ],
  pop: seq(
    particles({ recipe: ENERGY_BALL_BURST, count: 14 }),
    sprite({ texture: TEX.flare, colour: [0.5, 0.75, 1], size: 1.3, seconds: 0.22, growFrom: 0.5, grow: 1.3, fadeTail: 0.7 }),
    placeBodyLight(17, 'pop')
  ),
};

/**
 * BITMAP_ENERGY's `(0.2, 0.4, 1) x LT * 0.2` range 2: Lum runs 4 down to 2 over a 6-tile flight and
 * AddTerrainLight has no upper clamp, so the core saturates pale cyan with a blue rim. The effect stops it.
 */
const ENERGY_BALL_LIGHT: LightRecipe = {
  color: [0.2, 0.4, 1],
  range: 2,
  seconds: 20 * 0.04,
  release: 0.04,
  gain: 3,
  floorGain: 3,
};

export default defineSkill({
  id: 17,
  name: "Energy Ball",
  // 17 Energy Ball: at the release, BITMAP_ENERGY flies from the caster 100 cm up; one Spark03 pop within 100 cm of the target (energyBall).
  // Enhanced: a held glow and spark wake on the ball, a spark burst on the pop.
  visual: { impact: energyBall(), enhanced: { impact: energyBall(ENERGY_BALL_LOOK) } },
  // Energy Ball: BITMAP_ENERGY's light rides the ball and dies with it; nothing on arrival (ZzzEffect.cpp:6879-6883).
  // Enhanced: the held glow's blue riding the ball, and a short flash where it pops.
  light: {
    land: ENERGY_BALL_LIGHT,
    enhanced: {
      land: effectLight([0.35, 0.6, 1], 0.8, 20 * 0.04, { release: 0.04 }),
      bodies: { pop: effectLight([0.5, 0.75, 1], 1, 0.3, { release: 0.25 }) },
    },
  },
});
