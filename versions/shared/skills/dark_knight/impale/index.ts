import { defineSkill } from '@/controllers/skills/define';
import { CAST_HEIGHT, SkillContext, Step, TICK, baseSkill, cm, currentSkill, forwardOf, perTick, ticks } from '@/controllers/skills/visuals';
import { DEG, WEAPON_LINK_BONE } from '../../_shared';
import { DRILL_EMITTER_TICKS, JOINT_SPARKS, muAngles, rand, sayAt, sparkHeading, tailOfSlot } from '../_shared';
import { MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { bonePos, delay, entityGone, entityPos, entityYaw, fxNow, type ParticleRecipe, type PointSource, type RGB } from '@/controllers/fx/core';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';

/** One BITMAP_JOINT_HEALING sub6 of the Impale gather: where it starts, its heading and the tick it was born. */
interface SpearThread {
  from: Vector3;
  dir: Vector3;
  born: number;
}
/**
 * Impale's gather (MoveHandlers.cpp:670-690; ZzzEffectJoint.cpp:481-504, :3632-3690): MODEL__SPEAR, never drawn, sits
 * where `Weapon[0]`'s link bone was at t4 for LT 5 and sends three JOINT_HEALING sub6 a tick at it from 100 cm out,
 * `Angle (0..89, 0, 0..359)` (the upper half). JointEnergy01, Light (1, 1, 0.5), 5 cm, LT 12, four tails; the head
 * goes 2 cm a tick faster each move from rest, through the point and on. From LT 10 each joint lights a Shiny02
 * glint at the point, `(6 - |LT - 6|) x 0.15` bright and 0.4-0.75 of 32 x 64 texels.
 */
function spearGather(c: SkillContext, at: Vector3, hd = false): void {
  const t0 = fxNow();
  const tickOf = (): number => Math.floor((fxNow() - t0) / TICK + 1e-3);
  const threads: SpearThread[] = [];
  for (let b = 0; b < 5; b++) {
    for (let j = 0; j < 3; j++) {
      const dir = sparkHeading(rand(0, 90) * DEG, rand(0, 360) * DEG);
      threads.push({ from: at.subtract(dir), dir, born: b });
    }
  }
  const head = (s: SpearThread, m: number, out: Vector3): Vector3 => {
    const d = cm(m * (m - 1));
    return out.set(s.from.x + s.dir.x * d, s.from.y + s.dir.y * d, s.from.z + s.dir.z * d);
  };
  effects.spawn('joint', c.scene, Vector3.Zero(), {
    paths: {
      count: threads.length,
      fill: (k, j, out) => {
        const s = threads[k];
        const m = tickOf() - s.born + 1;
        if (m < 1 || m > 13) return 0;
        head(s, Math.max(0, m - j), out);
        return 1;
      },
    },
    maxTails: 3,
    seconds: ticks(4 + 13),
    width: cm(5),
    fadeTail: 0,
    colour: [1, 1, 0.5],
    texture: TEX.jointEnergy,
  });
  for (const s of threads) {
    delay(ticks(s.born + 2), () => {
      effects.spawn('sprite', c.scene, at, {
        texture: TEX.shiny2,
        size: cm(32) * rand(0.4, 0.75),
        aspect: 2,
        seconds: ticks(11),
        fadeTail: 0,
        intensity: p => (6 - Math.abs(10 - Math.floor(p * 11) - 6)) * 0.15,
      });
    });
  }
  if (hd) {
    // Graded tiers: the point swells gold as the threads pass through it, with motes around it and its light.
    effects.spawn('sprite', c.scene, at, { texture: TEX.flare, colour: [1, 0.78, 0.4], size: 1.1, seconds: ticks(12), sizeAt: p => 0.3 + 0.7 * Math.min(1, p * 2), fadeTail: 0.4 });
    effects.spawn('particles', c.scene, at, { recipe: IMPALE_MOTES, rate: 50, seconds: ticks(7) });
    lighting.skillBody(c.scene, baseSkill(currentSkill), 'gather', out => {
      out.x = at.x;
      out.y = at.y;
      out.z = at.z;
    });
  }
}

/** Graded tiers: gold motes around Impale's gathering point, and the sparks the cone throws forward. */
const IMPALE_MOTES: ParticleRecipe = {
  texture: TEX.spark2,
  colour: [1, 0.88, 0.5],
  colourEnd: [1, 0.45, 0.1],
  size: 0.06,
  sizeJitter: 0.4,
  life: 0.3,
  lifeJitter: 0.3,
  box: [0.3, 0.3, 0.3],
  dir1: [-1, -1, -1],
  dir2: [1, 1, 1],
  power: 0.6,
  capacity: 128,
};
const CONE_SPARKS: ParticleRecipe = {
  ...JOINT_SPARKS,
  colour: [1, 0.9, 0.7],
  colourEnd: [1, 0.5, 0.15],
  size: 0.03,
  life: 0.35,
  lifeJitter: 0.4,
  box: [0.25, 0.25, 0.25],
  dir1: [-0.25, -0.25, -0.25],
  dir2: [0.25, 0.25, 0.25],
  power: 7,
  powerJitter: 0.5,
  capacity: 256,
};
/** Graded tiers: the spears' comet streak and their tint, RidingSpear01's own blue-white. */
const SPEAR_STREAK: RGB = [0.3, 0.42, 0.85];
const SPEAR_TINT_HD: RGB = [0.38, 0.45, 0.65];

/** One BITMAP_FLARE sub4 of the Impale cone: its MODEL_SPEAR emitter, the facing, the tick it was born and its `Direction[0]`. */
interface ConeFlare {
  emitter: Vector3;
  yaw: number;
  born: number;
  phase: number;
}
/** BITMAP_FLARE sub4's life and tails (ZzzEffectJoint.cpp:1905-1914): 110, spent 2 sub-steps on the birth tick, 12 on each after. */
const CONE_LIFE = 110;
const CONE_TAILS = 200;
const coneSubSteps = (age: number): number => 2 + 12 * age;
const CONE_TICKS = 10;

/**
 * Impale's cone (ZzzCharacter.cpp:2720-2731; EffectBehaviors.cpp:87-95; ZzzEffectJoint.cpp:1883-1921, :5570-5604):
 * two MODEL_SPEAR emitters, never drawn, 50 cm ahead and 110 cm up for LT 10, each leaving a white BITMAP_FLARE sub4
 * (Flare.jpg, width 50) a tick. A flare's centre walks 2 cm a sub-step along the facing while its head circles the
 * side/up plane at `(LT + 40) x 0.65` cm (97 -> 26), 0.1 rad a sub-step; MaxTails 200 keeps its whole path.
 */
function spearCone(c: SkillContext, hd = false): void {
  const caster = c.caster;
  const yaw = entityYaw(caster);
  const f = forwardOf(yaw);
  const emitter = entityPos(caster, cm(110), new Vector3());
  emitter.x += f.x * cm(50);
  emitter.z += f.z * cm(50);
  const t0 = fxNow();
  const tickOf = (): number => Math.floor((fxNow() - t0) / TICK + 1e-3);
  const flares: ConeFlare[] = [];
  for (let k = 0; k < DRILL_EMITTER_TICKS; k++) {
    for (let e = 0; e < 2; e++) flares.push({ emitter, yaw, born: k, phase: Math.floor(Math.random() * 360) });
  }
  const sx = Math.cos(yaw);
  const sz = Math.sin(yaw);
  const head = (d: ConeFlare, a: number, out: Vector3): Vector3 => {
    const lifeTime = CONE_LIFE - a;
    const r = Math.max(lifeTime + 40, 10) * 0.65;
    const turn = (d.phase + lifeTime) * 0.1;
    const side = cm(-Math.cos(turn) * r);
    const walk = cm(2 * (a + 1));
    return out.set(d.emitter.x + f.x * walk + sx * side, d.emitter.y + cm(Math.sin(turn) * r), d.emitter.z + f.z * walk + sz * side);
  };
  effects.spawn('joint', c.scene, Vector3.Zero(), {
    paths: {
      count: flares.length,
      fill: (k, j, out) => {
        const d = flares[k];
        const age = tickOf() - d.born;
        if (age < 0 || age >= CONE_TICKS) return 0;
        const n = coneSubSteps(age);
        head(d, Math.max(0, n - 1 - tailOfSlot(j, n, CONE_TAILS)), out);
        return 1;
      },
    },
    maxTails: CONE_TAILS - 1,
    seconds: ticks(DRILL_EMITTER_TICKS + CONE_TICKS),
    width: cm(50),
    fadeTail: 0,
    colour: RGBS.white,
    texture: TEX.flareBig,
  });
  if (!hd) return;
  // Graded tiers: sparks flung forward off the spiral while it runs, and the cone's warm light at its middle.
  const heading = new Vector3(f.x, 0, f.z);
  for (let k = 0; k < DRILL_EMITTER_TICKS + 2; k++) {
    delay(ticks(k), () => {
      if (entityGone(caster)) return;
      const p = new Vector3(emitter.x + f.x * 0.6, emitter.y, emitter.z + f.z * 0.6);
      effects.spawn('particles', c.scene, p, { recipe: CONE_SPARKS, count: 3, heading });
    });
  }
  const mid = new Vector3(emitter.x + f.x * 1.1, emitter.y, emitter.z + f.z * 1.1);
  lighting.skillBody(c.scene, baseSkill(currentSkill), 'cone', out => {
    out.x = mid.x;
    out.y = mid.y;
    out.z = mid.z;
  });
}

/**
 * Impale's AttackStage (ZzzCharacter.cpp:2702-2760), `t` = AttackTime (1 at the packet): t4 the gather at the weapon's
 * link bone, t8 the cone, t10 SOUND_RIDINGSPEAR, t13 and t14 three MODEL_SPEARSKILL each (ZzzEffect.cpp:641-646,
 * :8683-8694): RidingSpear01 at Scale 1.5, 145 cm ahead and 110 cm up +-30 cm, drawn RENDER_BRIGHT at 0.3 grey x
 * LT x 0.05, drifting 5 cm a tick along the facing. No light. The mounted cast's glint and swing are the cast's
 * (skillCastSystem warriorCast).
 */
const impaleOf = (hd: boolean): Step => (at, c) => {
  const caster = c.caster;
  delay(ticks(3), () => {
    if (!entityGone(caster)) spearGather(c, bonePos(caster, WEAPON_LINK_BONE, new Vector3(), CAST_HEIGHT), hd);
  });
  delay(ticks(7), () => {
    if (!entityGone(caster)) spearCone(c, hd);
  });
  delay(ticks(9), () => {
    if (!entityGone(caster)) sayAt(c, 'Sound/eRidingSpear');
  });
  for (const t of [13, 14]) {
    delay(ticks(t - 1), () => {
      if (entityGone(caster)) return;
      const yaw = entityYaw(caster);
      const f = forwardOf(yaw);
      for (let i = 0; i < 3; i++) {
        const start = entityPos(caster, cm(110) + rand(-0.3, 0.3), new Vector3());
        start.x += f.x * cm(145) + rand(-0.3, 0.3);
        start.z += f.z * cm(145) + rand(-0.3, 0.3);
        const t1 = fxNow();
        const follow: PointSource = out => {
          const d = perTick(5) * (fxNow() - t1 + TICK);
          return out.set(start.x + f.x * d, start.y, start.z + f.z * d);
        };
        effects.spawn('model', c.scene, start, {
          model: MODEL.ridingSpear,
          seconds: ticks(20),
          scale: 1.5,
          colour: hd ? SPEAR_TINT_HD : [0.3, 0.3, 0.3],
          plainColour: hd,
          fadeTail: 1,
          rotate: out => muAngles(out, 0, 0, yaw),
          follow,
        });
        if (hd) {
          // Graded tiers: each spear draws a short blue-white streak behind it.
          effects.spawn('joint', c.scene, start, {
            head: follow,
            maxTails: 6,
            taper: true,
            width: 0.3,
            colour: SPEAR_STREAK,
            texture: TEX.flare2,
            seconds: ticks(16),
            fadeTail: 0.6,
          });
        }
      }
      if (hd && t === 13) {
        // Graded tiers: the thrust lands as a blue-white flash ahead of the knight, and the spears carry their light.
        const tip = entityPos(caster, cm(110), new Vector3());
        tip.x += f.x * cm(145);
        tip.z += f.z * cm(145);
        effects.spawn('sprite', c.scene, tip, { texture: TEX.flare, colour: [0.4, 0.5, 0.85], size: 1.1, seconds: ticks(6), grow: 1.4, fadeTail: 0.7 });
        const t1 = fxNow();
        lighting.skillBody(c.scene, baseSkill(currentSkill), 'spears', out => {
          const d = perTick(5) * (fxNow() - t1 + TICK);
          out.x = tip.x + f.x * d;
          out.y = tip.y;
          out.z = tip.z + f.z * d;
        });
      }
    });
  }
};
const impale = impaleOf(false);

export default defineSkill({
  id: 47,
  name: "Impale",
  // 47 Impale: t4 threads gather on the spear point, t8 a white spiral cone, t10 the sound, t13-14 six spears; see impale.
  visual: { cast: impale, enhanced: { cast: impaleOf(true) } },
});
