import { defineSkill } from '@/controllers/skills/define';
import { DW1_RELEASE, bearing, monsterOf, placeBodyLight, releaseSound } from '../_shared';
import { ENERGY_BALL_BURST, ENERGY_BALL_CORE, ENERGY_BALL_GLOW, ENERGY_BALL_POP, ENERGY_BALL_STAR, ENERGY_BALL_WAKE, TEX } from '@/controllers/fx/recipes';
import { delay, entityGone, entityPos, fxNow, type ParticleRecipe, type PointSource } from '@/controllers/fx/core';
import { Step, TICK, cm, forwardOf, particles, perTick, seq, sprite, ticks } from '@/controllers/skills/visuals';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';

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
  delay(DW1_RELEASE, () => {
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

export default defineSkill({
  id: 17,
  name: "Energy Ball",
  // 17 Energy Ball: at the release, BITMAP_ENERGY flies from the caster 100 cm up; one Spark03 pop within 100 cm of the target (energyBall).
  // Enhanced: a held glow and spark wake on the ball, a spark burst on the pop.
  visual: { impact: energyBall(), enhanced: { impact: energyBall(ENERGY_BALL_LOOK) } },
});
