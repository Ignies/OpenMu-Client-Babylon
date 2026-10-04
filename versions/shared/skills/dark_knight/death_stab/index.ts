import { defineSkill } from '@/controllers/skills/define';
import { CAST_HEIGHT, IMPACT_HEIGHT, SkillContext, Step, TICK, baseSkill, cm, currentSkill, forwardOf, particles, sprite, ticks } from '@/controllers/skills/visuals';
import { DRILL_EMITTER_TICKS, rand, sayAt } from '../_shared';
import { ENUM_WORLD } from '@/core/types';
import { type Entity } from '@/ecs/world';
import { bonePos, delay, entityGone, entityPos, entityYaw, fxNow, type ParticleRecipe, type PointSource } from '@/controllers/fx/core';
import { TEX } from '@/controllers/fx/recipes';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { WEAPON_LINK_BONE, magicScrew } from '../../_shared';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';
import { Ecs } from '@/ecs/current';

import { A } from '@/controllers/combat/recipes';

import { effectLight } from '@/controllers/lighting/recipes';

/** `m_vPosSword`: `Weapon[0]`'s link bone, 300 cm along the facing (ZzzCharacter.cpp:2652-2660). */
function swordPoint(caster: Entity, forward: number, out: Vector3): Vector3 {
  bonePos(caster, WEAPON_LINK_BONE, out, CAST_HEIGHT);
  const f = forwardOf(entityYaw(caster));
  out.x += f.x * forward;
  out.z += f.z * forward;
  return out;
}

/** One MODEL_SPEARSKILL sub2 gather streak: where it starts, the tick it was born and its GetMagicScrew seed. */
interface GatherStreak {
  from: Vector3;
  born: number;
  screw: number;
}
/** MODEL_SPEARSKILL sub2's life and tails (ZzzEffectJoint.cpp:1575-1581). */
const GATHER_LIFE = 20;
const GATHER_TAILS = 5;

/**
 * Death Stab's gather streaks as one batch (ZzzEffectJoint.cpp:4283-4306): NSkill, Light (1, 0.3, 0.3), width
 * `LifeTime x 3` cm. A head runs from its start (+ a 1 cm GetMagicScrew wobble) onto the gathering point of its
 * tick over LT 20..10 and rests there; its tails are where it was the ticks before.
 */
function gatherStreaks(c: SkillContext, tickOf: () => number, t0: number, streaks: GatherStreak[], gathers: Vector3[]): void {
  const screw = new Vector3();
  const head = (s: GatherStreak, a: number, out: Vector3): Vector3 => {
    const g = gathers[Math.min(s.born + a, gathers.length - 1)];
    magicScrew(s.screw, 1.4, (t0 + (s.born + a) * TICK) * 1000, screw).scaleInPlace(cm(1)).addInPlace(s.from);
    return Vector3.LerpToRef(screw, g, Math.min(1, a / 10), out);
  };
  effects.spawn('joint', c.scene, Vector3.Zero(), {
    paths: {
      count: 3 * 7,
      fill: (k, j, out) => {
        const s = streaks[k];
        if (!s) return 0;
        const age = tickOf() - s.born;
        if (age < 0 || age >= GATHER_LIFE) return 0;
        head(s, Math.max(0, age - j), out);
        return (GATHER_LIFE - age) / GATHER_LIFE;
      },
    },
    maxTails: GATHER_TAILS - 1,
    seconds: ticks(8 + GATHER_LIFE),
    width: cm(GATHER_LIFE * 3),
    fadeTail: 0,
    colour: [1, 0.3, 0.3],
    texture: TEX.flareForce,
    until: () => entityGone(c.caster),
  });
}

/** One BITMAP_FLARE sub12 of the drill: its MODEL_SPEAR emitter, the facing, the tick it was born and its `Direction[0]`. */
interface DrillFlare {
  emitter: Vector3;
  yaw: number;
  born: number;
  phase: number;
}
/** BITMAP_FLARE sub12's life and tails (ZzzEffectJoint.cpp:1886-1888). */
const DRILL_LIFE = 70;
const DRILL_TAILS = 50;
/**
 * MoveJoint re-runs itself until LifeTime hits a multiple of 12 (ZzzEffectJoint.cpp:6959-6968), each sub-step
 * moving and leaving a tail: 10 sub-steps on the birth tick, 12 on each tick after, dead on its seventh tick.
 */
const drillSubSteps = (age: number): number => 10 + 12 * age;
const DRILL_TICKS = 6;

/**
 * Death Stab's blue drill as one batch (EffectBehaviors.cpp:87-95; ZzzEffectJoint.cpp:1883-1897, :5570-5604):
 * Flare.jpg, Light (0.1, 0.1, 1), width 100 cm. A flare's centre walks 4 cm a sub-step along the facing; its
 * head circles 26 cm out in the side/up plane at 0.1 rad a sub-step, sinking `(90 - LifeTime) x 0.3` cm.
 */
function drillFlares(c: SkillContext, tickOf: () => number, flares: DrillFlare[], count: number, seconds: number): void {
  const head = (d: DrillFlare, a: number, out: Vector3): Vector3 => {
    const lifeTime = DRILL_LIFE - a;
    const turn = (d.phase + lifeTime) * 0.1;
    const side = -Math.cos(turn) * 26;
    const up = Math.sin(turn) * 26 - (90 - lifeTime) * 0.3;
    const fx = Math.sin(d.yaw);
    const fz = -Math.cos(d.yaw);
    const sx = Math.cos(d.yaw);
    const sz = Math.sin(d.yaw);
    const walk = cm(4 * (a + 1));
    return out.set(d.emitter.x + fx * walk + sx * cm(side), d.emitter.y + cm(up), d.emitter.z + fz * walk + sz * cm(side));
  };
  effects.spawn('joint', c.scene, Vector3.Zero(), {
    paths: {
      count,
      fill: (k, j, out) => {
        const d = flares[k];
        if (!d) return 0;
        const age = tickOf() - d.born;
        if (age < 0 || age >= DRILL_TICKS) return 0;
        head(d, Math.max(0, drillSubSteps(age) - 1 - j), out);
        return 1;
      },
    },
    maxTails: DRILL_TAILS - 1,
    seconds,
    width: 1,
    fadeTail: 0,
    colour: [0.1, 0.1, 1],
    texture: TEX.flareBig,
  });
}

/** A point that follows bone `bone`, knocked up to `range` tiles off it per axis, re-rolled once a tick (`GetNearRandomPos`). */
function jitteredBone(e: Entity, bone: number, range: number): PointSource {
  const off = new Vector3();
  let tick = -1;
  return out => {
    const k = Math.floor(fxNow() / TICK);
    if (k !== tick) {
      tick = k;
      off.set(rand(-range, range), rand(-range, range), rand(-range, range));
    }
    return bonePos(e, bone, out).addInPlace(off);
  };
}

/**
 * The Death Stab victim (ZzzCharacter.cpp:4094-4119): while `m_byHurtByDeathstab` counts down from 35, on
 * half the ticks every bone with a parent (dummies skipped) gets a JOINT_THUNDER sub7 to that parent, both
 * ends +-20 cm, width 20, Light (0.5, 0.5, 1), LT 1 (ZzzEffectJoint.cpp:1164-1173): a short humming crackle,
 * three jittered segments here. Not in Battle Castle.
 */
function electrifiedSkeleton(c: SkillContext, target: Entity, seconds: number): void {
  if (Ecs.world?.mapIndex === ENUM_WORLD.WD_30BATTLECASTLE) return;
  const bones = target.modelObject?.gltf?.skeleton?.bones;
  if (!bones) return;
  const pairs: { from: PointSource; to: PointSource }[] = [];
  for (let i = 1; i < bones.length; i++) {
    if (/dummy/i.test(bones[i].name)) continue;
    const parent = bones[i].getParent();
    const pi = parent ? bones.indexOf(parent) : -1;
    if (pi >= 1) pairs.push({ from: jitteredBone(target, i - 1, cm(20)), to: jitteredBone(target, pi - 1, cm(20)) });
  }
  if (pairs.length) {
    effects.spawn('joint', c.scene, entityPos(target, 0, new Vector3()), {
      pairs,
      segments: 3,
      jitter: 0.08,
      width: cm(20),
      colour: [0.5, 0.5, 1],
      texture: TEX.jointThunder,
      textureScroll: 1,
      seconds,
      fadeTail: 0.05,
      reroll: TICK,
      blink: 0.5,
      until: () => entityGone(target),
    });
  }
}

/** Graded tiers: blue motes the drill throws off as it spins out, and the victim's crackle sparks. */
const DRILL_MOTES: ParticleRecipe = {
  texture: TEX.flareBlue,
  colour: [0.55, 0.65, 1],
  colourEnd: [0.15, 0.2, 0.8],
  size: 0.12,
  sizeJitter: 0.4,
  life: 0.45,
  lifeJitter: 0.4,
  box: [0.1, 0.1, 0.1],
  dir1: [-0.5, -0.4, -0.5],
  dir2: [0.5, 0.5, 0.5],
  aimed: true,
  power: 5,
  powerJitter: 0.6,
  gravity: -1,
  capacity: 256,
};
const STAB_SPARKS: ParticleRecipe = { ...DRILL_MOTES, aimed: false, dir1: [-1, -0.2, -1], dir2: [1, 1.2, 1], power: 2.5, gravity: -5, life: 0.5 };
/** Graded tiers: red chips drawn in to the gathering point, a hotter red than the streaks' so the curve keeps it red. */
const GATHER_MOTES: ParticleRecipe = {
  texture: TEX.spark2,
  colour: [1, 0.32, 0.18],
  colourEnd: [0.6, 0.05, 0.02],
  size: 0.07,
  sizeJitter: 0.4,
  life: 0.3,
  lifeJitter: 0.3,
  box: [0.35, 0.35, 0.35],
  dir1: [-1, -1, -1],
  dir2: [1, 1, 1],
  power: 0.6,
  capacity: 128,
};

/**
 * Death Stab's AttackStage (ZzzCharacter.cpp:2618-2701), `t` = AttackTime, seen on tick `t` after the packet:
 * t2-8 three red streaks a tick from a +-300 cm cube 1400 cm behind the knight onto the gathering point;
 * t8 SOUND_SKILL_SWORD2; t6-12 on half the ticks two MODEL_SPEAR emitters in front of the sword, each
 * leaving a blue drill flare a tick for 10 ticks; t10 the victim's electrified skeleton for its 35-tick
 * countdown, re-armed to t12.
 */
const deathStabOf = (hd: boolean): Step => (_at, c) => {
  const skill = baseSkill(currentSkill);
  // AttackStage first sees AttackTime 1 a tick after the packet; from there `t` lands on tick `t` (ZzzCharacter.cpp:4132-4136).
  delay(TICK, () => {
    if (!entityGone(c.caster)) deathStabStages(c, skill, hd);
  });
};

/** The stages from AttackTime 1 (`t0`): AttackTime `t` at `t0 + ticks(t - 1)`. */
function deathStabStages(c: SkillContext, skill: number, hd: boolean): void {
  const caster = c.caster;
  const target = c.target;
  const t0 = fxNow();
  const tickOf = (): number => Math.floor((fxNow() - t0) / TICK + 1e-3);

  const gathers = [swordPoint(caster, 3, new Vector3())];
  const streaks: GatherStreak[] = [];
  gatherStreaks(c, tickOf, t0, streaks, gathers);
  if (hd) {
    // Graded tiers: the gathering point swells red as the streaks arrive, with chips drawn in and its light.
    const gather: PointSource = out => out.copyFrom(gathers[Math.min(tickOf(), gathers.length - 1)]);
    delay(ticks(1), () => {
      if (entityGone(caster)) return;
      const p = gather(new Vector3());
      effects.spawn('sprite', c.scene, p, { texture: TEX.flare, colour: [1, 0.2, 0.08], size: 1.4, seconds: ticks(12), sizeAt: q => 0.35 + 0.65 * Math.min(1, q * 1.6), fadeTail: 0.35, follow: gather });
      effects.spawn('particles', c.scene, p, { recipe: GATHER_MOTES, rate: 40, seconds: ticks(8), follow: gather });
      lighting.skillBody(c.scene, skill, 'gather', out => {
        const g = gathers[Math.min(tickOf(), gathers.length - 1)];
        out.x = g.x;
        out.y = g.y;
        out.z = g.z;
      });
    });
  }

  // The `rand_fps_check(2)` rolls of t6-12, drawn up front so the drill batch is sized to its flares.
  const rolls = Array.from({ length: 7 }, () => Math.random() < 0.5);
  const flares: DrillFlare[] = [];
  const lastRoll = rolls.lastIndexOf(true);
  if (lastRoll >= 0) drillFlares(c, tickOf, flares, rolls.filter(Boolean).length * 2 * DRILL_EMITTER_TICKS, ticks(5 + lastRoll + DRILL_EMITTER_TICKS + DRILL_TICKS + 1));

  for (let t = 2; t <= 12; t++) {
    delay(ticks(t - 1), () => {
      if (entityGone(caster)) return;
      const n = t - 1;
      const yaw = entityYaw(caster);
      const f = forwardOf(yaw);
      if (t <= 8) {
        gathers[n] = swordPoint(caster, 3, new Vector3());
        const base = entityPos(caster, cm(120), new Vector3());
        for (let j = 0; j < 3; j++) {
          const from = new Vector3(base.x + rand(-3, 3) - f.x * 14, base.y + rand(-3, 3), base.z + rand(-3, 3) - f.z * 14);
          streaks.push({ from, born: n, screw: Math.floor(Math.random() * 4096) * 17721 });
        }
      }
      if (t === 8) sayAt(c, 'Sound/sKnightSkill2');
      if (t >= 6 && rolls[t - 6]) {
        const emitter = swordPoint(caster, cm(100 + (t - 8) * 10), new Vector3());
        for (let k = 0; k < DRILL_EMITTER_TICKS; k++) {
          for (let e = 0; e < 2; e++) flares.push({ emitter, yaw, born: n + k, phase: Math.floor(Math.random() * 360) });
        }
        if (hd) {
          // Graded tiers: motes flung forward off the spin, and one light down the drill's 2.8 m from its first roll.
          effects.spawn('particles', c.scene, emitter, { recipe: DRILL_MOTES, count: 10, heading: new Vector3(f.x, 0, f.z) });
          if (t - 6 === rolls.indexOf(true)) {
            const mid = new Vector3(emitter.x + f.x * 1.4, emitter.y, emitter.z + f.z * 1.4);
            lighting.skillBody(c.scene, skill, 'drill', out => {
              out.x = mid.x;
              out.y = mid.y;
              out.z = mid.z;
            });
          }
        }
      }
      if (t === 10 && target && !entityGone(target)) {
        electrifiedSkeleton(c, target, ticks(37));
        if (hd) {
          // Graded tiers: the stab lands as a blue flash and sparks on the chest, and the crackle lights the body.
          const chest = entityPos(target, IMPACT_HEIGHT, new Vector3());
          sprite({ texture: TEX.flareBlue, colour: [0.5, 0.6, 1], size: 1.1, seconds: ticks(8), grow: 1.4, growFrom: 0.4, fadeTail: 0.6 })(chest, c);
          particles({ recipe: STAB_SPARKS, count: 16 })(chest, c);
          lighting.skillBody(c.scene, skill, 'victim', out => {
            entityPos(target, IMPACT_HEIGHT, chest);
            out.x = chest.x;
            out.y = chest.y - IMPACT_HEIGHT;
            out.z = chest.z;
          });
        }
      }
    });
  }
}
const deathStab = deathStabOf(false);

export default defineSkill({
  id: 43,
  name: "Death Stab",
  // UseSkillWarrior's glint (SkillCast.cpp:113-247, :357-376).
  warriorGlint: true,
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [336, 339, 342],
  // 43 Death Stab: red streaks gathering in front of the sword, the blue drill and the victim's electrified
  // skeleton, staged on AttackTime; see deathStab.
  visual: {
    cast: deathStab,
    // Graded tiers: the gathering point swells red, the drill throws blue motes, the stab flashes on the victim; each lit.
    enhanced: { cast: deathStabOf(true) },
  },
  clip: { ground: A.PLAYER_ATTACK_ONETOONE }, // Death Stab
  // Death Stab: the original lights nothing. On the graded tiers the red gathering point, the blue drill over its
  // 2.8 m (centred 1.4 m out, lit from the first roll to the last flare) and the victim's crackle each light like their art.
  light: {
    enhanced: {
      bodies: {
        gather: effectLight([1, 0.22, 0.1], 0.6, 0.48, { heightOffset: 0, attack: 0.16, release: 0.2 }),
        drill: effectLight([0.3, 0.4, 1], 1.5, 0.9, { heightOffset: 0, release: 0.35, flicker: { min: 0.75, max: 1, steps: 4 } }),
        victim: effectLight([0.5, 0.55, 1], 0.8, 1.48, { heightOffset: 0.9, release: 0.3, flicker: { min: 0.4, max: 1, steps: 3 } }),
      },
    },
  },
});
