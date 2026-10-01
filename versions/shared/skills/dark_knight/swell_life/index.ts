import { defineSkill } from '@/controllers/skills/define';
import { DEG } from '../../_shared';
import { type Entity } from '@/ecs/world';
import { delay, entityGone, entityPos, fxNow, type ParticleRecipe, type PointSource, type RGB } from '@/controllers/fx/core';
import { PlayerAction } from '@versions/shared/objects/enum';
import { RGBS, TEX } from '@/controllers/fx/recipes';
import { SkillContext, Step, TICK, baseSkill, cm, currentSkill, ticks } from '@/controllers/skills/visuals';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';
import { rand, sayAt, sparkHeading, tailOfSlot } from '../_shared';

import { A } from '@/controllers/combat/recipes';

import { effectLight } from '@/controllers/lighting/recipes';

/** JOINT_SPIRIT sub2's life, tails and speed (ZzzEffectJoint.cpp:668-679, :3935-3945): 21 moves, Velocity 50 then +5 a move. */
const SPIRIT_MOVES = 21;
const spiritReach = (m: number): number => cm(50 * m + 2.5 * m * (m - 1));
/** One BITMAP_FLARE sub2 of the Swell Life column: its spot under the feet, LifeTime and first `Direction[2]`. */
interface RisingFlare {
  x: number;
  z: number;
  life: number;
  rise: number;
}
/** Swell Life casts a caster has pending: a packet restarts `AttackTime`, so only the latest one bursts. */
const swellLifePending = new WeakMap<Entity, number>();

/**
 * The Swell Life burst (ZzzCharacter.cpp:4190-4213), from the caster + 100 cm:
 * - 36 JOINT_SPIRIT sub2 at `Angle (-10, 0, i x 10)`: JointSpirit01, width 60, three tails, Light 0.5 then x 1/1.2 a
 *   move once LT < 10. Each move the head draws a flare01 BITMAP_LIGHT of scale `4 + (20 - LT) / 5`, (1, 0.5, 0.1)
 *   while LT >= 10 and the joint's own grey after (ZzzEffectJoint.cpp:3895-3947).
 * - At LT 19 each spawns a BITMAP_FLARE sub2 +-100 cm around, 100 cm under the feet: Flare.jpg, white, width 40, 20
 *   tails, LT 25-74, still until LT 25, then up `Direction[2] + 5` a tick from 35-54 (ZzzEffectJoint.cpp:1786-1798, :5455-5462).
 * - Joints 0 and 20 put a BITMAP_MAGIC+1 sub4 at the feet: Magic_Ground2 2-4 tiles across, turned 0 and -200 deg,
 *   LT 40, (1, 0.5, 0.1) x `sin((60 - LT) x 0.05) + 0.5`, the last four ticks 0.8..0.2 (ZzzEffect.cpp:1188-1195, :9787-9882).
 */
function swellLifeBurst(c: SkillContext, hd = false): void {
  const caster = c.caster;
  sayAt(c, 'Sound/eSwellLife');
  const origin = entityPos(caster, 1, new Vector3());
  const feet = entityPos(caster, 0, new Vector3());
  const t0 = fxNow();
  const moves = (): number => Math.floor((fxNow() - t0) / TICK + 1e-3) + 1;
  const headings = Array.from({ length: 36 }, (_, i) => sparkHeading(-10 * DEG, i * 10 * DEG));
  const spirit = (i: number, m: number, out: Vector3): Vector3 => {
    const h = headings[i];
    const d = spiritReach(Math.max(0, m));
    return out.set(origin.x + h.x * d, origin.y + h.y * d, origin.z + h.z * d);
  };
  effects.spawn('joint', c.scene, Vector3.Zero(), {
    paths: {
      count: headings.length,
      fill: (k, j, out) => {
        const m = moves();
        if (m > SPIRIT_MOVES) return 0;
        spirit(k, m - j, out);
        return hd ? (SPIRIT_SPINDLE_HD[j] ?? 0) : 1;
      },
    },
    maxTails: 2,
    seconds: ticks(SPIRIT_MOVES),
    width: hd ? SPIRIT_WIDTH_HD : cm(60),
    // Light x 1/1.2 a move over the last 10 of 21, drawn as a linear fade.
    fadeTail: 10 / SPIRIT_MOVES,
    colour: hd ? SPIRIT_TINT_HD : [0.5, 0.5, 0.5],
    texture: TEX.jointSpirit,
  });
  const headSize = cm(64) * (hd ? SPIRIT_HEAD_HD : 1);
  for (let i = 0; i < headings.length; i++) {
    const follow: PointSource = out => spirit(i, Math.min(SPIRIT_MOVES, moves()), out);
    effects.spawn('sprite', c.scene, origin, { texture: TEX.flare, colour: hd ? SPIRIT_GLOW_HD : [1, 0.5, 0.1], size: headSize, seconds: ticks(11), fadeTail: 0, follow, sizeAt: p => 4 + Math.floor(p * 11) / 5 });
    delay(ticks(11), () =>
      effects.spawn('sprite', c.scene, origin, {
        texture: TEX.flare,
        colour: hd ? SPIRIT_FADE_HD : [0.5, 0.5, 0.5],
        size: headSize,
        seconds: ticks(10),
        fadeTail: 0,
        follow,
        sizeAt: p => 4 + (11 + Math.floor(p * 10)) / 5,
        intensity: p => Math.pow(1 / 1.2, 1 + Math.floor(p * 10)),
      })
    );
  }
  const flares: RisingFlare[] = headings.map(() => ({ x: origin.x + rand(-1, 1), z: origin.z + rand(-1, 1), life: 25 + Math.floor(Math.random() * 50), rise: 35 + Math.floor(Math.random() * 20) }));
  const floor = origin.y - 2;
  effects.spawn('joint', c.scene, Vector3.Zero(), {
    paths: {
      count: flares.length,
      fill: (k, j, out) => {
        const fl = flares[k];
        // Born on the joint's second move; moves once a tick from the next.
        const age = moves() - 2;
        if (age < 0 || age > fl.life) return 0;
        const r = Math.min(26, Math.max(0, age - tailOfSlot(j, Math.min(20, age + 1), 20) - (fl.life - 25)));
        out.set(fl.x, floor + cm(r * fl.rise + 2.5 * r * (r + 1)), fl.z);
        return 1;
      },
    },
    maxTails: 19,
    seconds: ticks(2 + 75),
    width: cm(40),
    fadeTail: 0,
    colour: RGBS.white,
    texture: TEX.flareBig,
  });
  const pulse = (t: number): number => {
    const lifeTime = 39 - Math.floor(t / TICK + 1e-3);
    return lifeTime < 5 ? 1 - (5 - lifeTime) * 0.2 : Math.sin((60 - lifeTime) * 0.05) + 0.5;
  };
  for (const turn of [0, -200]) {
    effects.spawn('ring', c.scene, feet, { texture: TEX.magicGround2, colour: [1, 0.5, 0.1], seconds: ticks(40), scale: rand(2, 4), spinFrom: turn, fadeTail: 0, brightness: pulse });
  }
  if (hd) swellLifeHd(c, origin, feet);
}

/**
 * Graded tiers: 36 flare01 cards 2.5-5 m across summed to a yellow sheet over the whole screen and the grey spirit
 * bands to a white disc 8 m wide; the same heads a third the size in a deeper orange, the bands narrower and warm.
 */
const SPIRIT_HEAD_HD = 0.3;
const SPIRIT_GLOW_HD: RGB = [1, 0.42, 0.08];
const SPIRIT_FADE_HD: RGB = [0.55, 0.32, 0.12];
const SPIRIT_TINT_HD: RGB = [0.45, 0.32, 0.17];
const SPIRIT_WIDTH_HD = cm(40);
/** JointSpirit01 is bright up to its head end and its long edges: pinched at both ends, a band reads as a blade, not a pane. */
const SPIRIT_SPINDLE_HD = [0.3, 1, 0.2];
/** Graded tiers: gold motes rising with the column. */
const SWELL_MOTES: ParticleRecipe = {
  texture: TEX.spark2,
  colour: [1, 0.85, 0.5],
  colourEnd: [1, 0.45, 0.1],
  size: 0.07,
  sizeJitter: 0.4,
  life: 1.2,
  lifeJitter: 0.4,
  box: [1, 0.1, 1],
  dir1: [-0.1, 1, -0.1],
  dir2: [0.1, 1, 0.1],
  power: 2.5,
  powerJitter: 0.6,
  gravity: 0.5,
  capacity: 160,
};
/** Graded tiers: the burst's flash on the knight, the motes, and the lights of the ring, the ground marks and the column. */
function swellLifeHd(c: SkillContext, origin: Vector3, feet: Vector3): void {
  const skill = baseSkill(currentSkill);
  effects.spawn('sprite', c.scene, origin, { texture: TEX.flare, colour: [1, 0.55, 0.18], size: 2.6, seconds: ticks(8), grow: 1.5, growFrom: 0.4, fadeTail: 0.7 });
  delay(ticks(2), () => effects.spawn('particles', c.scene, feet, { recipe: SWELL_MOTES, rate: 45, seconds: ticks(45) }));
  const at = (p: Vector3) => (out: { x: number; y: number; z: number }) => {
    out.x = p.x;
    out.y = p.y;
    out.z = p.z;
  };
  lighting.skillBody(c.scene, skill, 'burst', at(origin));
  lighting.skillBody(c.scene, skill, 'ground', at(feet));
  delay(ticks(2), () => lighting.skillBody(c.scene, skill, 'column', at(feet)));
}

/**
 * Swell Life (48, 356, 360, 363): ReceiveMagic starts PLAYER_SKILL_VITALITY with AttackTime 1 (WSclient.cpp:4800-4814).
 * The burst fires at AttackTime 10 while the knight is still in the clip, else when AttackTime reaches 15 by itself
 * (ZzzCharacter.cpp:2851-2858).
 */
const swellLifeOf = (hd: boolean): Step => (_at, c) => {
  const caster = c.caster;
  const token = (swellLifePending.get(caster) ?? 0) + 1;
  swellLifePending.set(caster, token);
  const fire = (): void => {
    if (entityGone(caster) || swellLifePending.get(caster) !== token) return;
    swellLifeBurst(c, hd);
  };
  delay(ticks(9), () => {
    if (caster.modelObject?.CurrentAction === PlayerAction.PLAYER_SKILL_VITALITY) fire();
    else delay(ticks(5), fire);
  });
};
const swellLife = swellLifeOf(false);
/** `g_byUpperBoneLocation` (ZzzEffect.cpp:34). */
const UPPER_BONES = [25, 26, 27, 20, 34, 35, 36] as const;

export default defineSkill({
  id: 48,
  name: "Swell Life",
  // 48 Swell Life: at AttackTime 10 the spirit ring, its orange glows, the rising column and two ground rings; see swellLife.
  visual: { cast: swellLife, enhanced: { cast: swellLifeOf(true) } },
  buffs: {
    // 8 Greater Fortitude / Swell Life (135 its proficiency): orange motes off the upper body.
    8: () => ({ boneMotes: { bones: UPPER_BONES, colour: [1, 0.5, 0.1] } }),
    135: () => ({ boneMotes: { bones: UPPER_BONES, colour: [1, 0.5, 0.1] } }),
  },
  clip: { ground: A.PLAYER_SKILL_VITALITY }, // Swell Life
  // Swell Life: the original lights nothing. On the graded tiers the orange spirit ring as it leaves the knight, the
  // two Magic_Ground2 marks (2-4 tiles across) for their 40 ticks, and the rising white column around him.
  light: {
    enhanced: {
      bodies: {
        burst: effectLight([1, 0.5, 0.12], 3, 0.6, { heightOffset: 0, release: 0.4 }),
        ground: effectLight([1, 0.5, 0.1], 1.5, 1.6, { heightOffset: 0.3, attack: 0.2, release: 0.5 }),
        column: effectLight([1, 0.85, 0.6], 1.2, 2.6, { heightOffset: 1.2, attack: 0.4, release: 1 }),
      },
    },
  },
  target: 'self',
});
