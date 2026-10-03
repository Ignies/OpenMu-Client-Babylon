import { defineSkill } from '@/controllers/skills/define';
import { type Entity } from '@/ecs/world';
import { MODEL, TEX } from '@/controllers/fx/recipes';
import { delay, entityGone, entityPos, fxNow, type ParticleRecipe, type PointSource, type RGB } from '@/controllers/fx/core';
import { SPLIT_EMBERS, STRIKE_MAX_TICKS, forceHeads, forwardOfDeg, movesAt, sideOf, yawDegrees } from '../_shared';
import { SkillContext, Step, TICK, after, baseSkill, cm, currentSkill, ticks } from '@/controllers/skills/visuals';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { groundAt, randInt } from '../../_shared';
import { lighting } from '@/controllers/lighting';
import { playCombat } from '@/controllers/sound/combat';
import { storeRef } from '@/app/storeRef';

import { A } from '@/controllers/combat/recipes';
import { MOUNTED_STRIKE } from '../_shared';

import { effectLight } from '@/controllers/lighting/recipes';

const UP = new Vector3(0, 1, 0);

/** Fire Scream's pairs (ZzzCharacter.cpp:4499-4533): yaw, and yaw ±10° moved ±80 cm along their own X. */
const SCREAM_PAIRS: readonly (readonly [number, number])[] = [
  [0, 0],
  [10, 80],
  [-10, -80],
];
/** MODEL_DARK_SCREAM(_FIRE) (ZzzEffect.cpp:1702-1731): LT 19, `Direction (0, -35, 0)`; moved 19 times, drawn after 18. */
const SCREAM_MOVES = 19;
const SCREAM_STEP = cm(35);
/** The ground streak, JOINT_FORCE sub7 (ZzzEffectJoint.cpp:2373-2386): V 10, Dir (3.5, _, 1), LT 20, MaxTails 13. */
const SCREAM_TAILS = 13;
const SCREAM_HEADS = forceHeads(10, 1, 3.5, 20, SCREAM_TAILS).map(cm);
/** It moves at LT 20..0: 21 drawn ticks. */
const SCREAM_STREAK_TICKS = 21;
/** A model's Scale after `n` moves: `Scale -= step`, 0 below 0.1 (MoveHandlers.cpp:4630-4640). */
const screamScale = (s0: number, step: number, n: number): number => {
  const s = s0 - step * n;
  return s < 0.1 ? 0 : s;
};

/**
 * One BITMAP_FLAME sub8 card (ZzzEffectParticle.cpp:592-607, :4838-4854): Flame01 at Scale `scale` - 0..0.19,
 * rising Gravity/2 and shrinking Gravity/95 a tick (Gravity = 1.8-2.8 x Scale), turning 2° a tick, 7 in 10
 * sliding along the path at -1..0.9 x Scale cm a tick, LT 33. A card born at Scale <= 0 dies at once.
 */
function screamFlame(c: SkillContext, at: Vector3, fwd: Vector3, scale: number, look?: ScreamLook): void {
  const s0 = scale - randInt(20) / 100;
  if (s0 <= 0) return;
  const gravity = (randInt(100) / 100 + 1.8) * s0;
  // Half the cards start half a Scale off in world x and y, and those turn the other way.
  const nudge = (randInt(2) / 2) * s0;
  const slide = randInt(10) >= 3 ? (randInt(20) / 10 - 1) * s0 : 0;
  // The graded cards stand on the ground instead of being cut in half by it (a hard line along the wall).
  const lift = look ? cm(64) * look.flameSize * s0 * look.flameLift : 0;
  const p0 = new Vector3(at.x + cm(nudge), at.y + lift, at.z + cm(nudge));
  const t0 = fxNow();
  effects.spawn('sprite', c.scene, p0, {
    texture: TEX.flame,
    colour: look?.flame,
    softEdge: !!look,
    size: cm(64) * (look?.flameSize ?? 1),
    seconds: ticks(32),
    spin: (nudge > 0 ? 2 : -2) * ((25 * Math.PI) / 180),
    follow: out => {
      const n = movesAt(fxNow() - t0);
      return out.set(p0.x - fwd.x * cm(slide * n), p0.y + cm((gravity / 2) * n), p0.z - fwd.z * cm(slide * n));
    },
    sizeAt: p => Math.max(0, s0 - (movesAt(p * ticks(32)) * gravity) / 95),
    fadeTail: look?.flameFade ?? 0,
  });
}

/** Any character but the caster and the hero within 1 m of `p`: CheckClientArrow's contact (ZzzEffect.cpp:6500-6503, :38-58). */
function screamContact(caster: Entity, p: Vector3): boolean {
  const world = storeRef().world;
  if (!world) return false;
  for (const e of world.netObjsQuery.entities) {
    if (e === caster || e.localPlayer || e.dying || !e.transform) continue;
    const dx = e.transform.pos.x - p.x;
    const dz = e.transform.pos.z - p.z;
    if (dx * dx + dz * dz <= 1) return true;
  }
  return false;
}

/**
 * One Fire Scream pair from `origin` along MU yaw `yaw`: after the arrow offset rotate(-10, -60, 135)
 * (ZzzEffect.cpp:1664-1667) MODEL_DARK_SCREAM_FIRE (motion blur streak + burst, additive, Scale 2.3 -0.14)
 * and, 20 cm ahead, MODEL_DARK_SCREAM (the claw sheet, alpha-tested, Scale 0.9 -0.04), both 35 cm a tick at
 * terrain + 3 and each dropping a flame card a tick; the claw dies on contact. At the start: the ground streak
 * and one BITMAP_BLUE_BLUR sub1 puff (PoundingBall, 20 cm on, 45 cm under the lifted claw, LT 30, Scale
 * 0.64-1.27 +0.19, rising 5 cm, Light LT/20; ZzzEffectParticle.cpp:943-950, :3988-3996).
 */
function screamPair(c: SkillContext, origin: Vector3, yaw: number, side: number, look?: ScreamLook): PointSource {
  const f = forwardOfDeg(yaw, new Vector3());
  const s = sideOf(yaw, new Vector3());
  const x0 = origin.x + s.x * cm(side - 10) + f.x * cm(60);
  const z0 = origin.z + s.z * cm(side - 10) + f.z * cm(60);
  const y0 = groundAt(x0, z0, origin.y);
  /** `d` tiles along the path, 3 cm over the ground there (re-pinned every tick). */
  const onGround = (d: number, out: Vector3): Vector3 => {
    out.set(x0 + f.x * d, 0, z0 + f.z * d);
    out.y = groundAt(out.x, out.z, y0) + cm(3);
    return out;
  };
  const t0 = fxNow();
  effects.spawn('model', c.scene, origin, {
    model: MODEL.darkScreamFire,
    seconds: ticks(SCREAM_MOVES - 1),
    angle: [0, 0, yaw],
    follow: out => onGround(SCREAM_STEP * movesAt(fxNow() - t0), out),
    scaleAt: t => screamScale(2.3, 0.14, movesAt(t)),
    fadeTail: 0,
  });
  const claw = effects.spawn('model', c.scene, origin, {
    model: MODEL.darkScream,
    seconds: ticks(SCREAM_MOVES - 1),
    angle: [0, 0, yaw],
    cutout: true,
    follow: out => onGround(cm(20) + SCREAM_STEP * movesAt(fxNow() - t0), out),
    scaleAt: t => screamScale(0.9, 0.04, movesAt(t)),
    fadeTail: 0,
  });

  // The streak: its tails where the head stood after moves 1..13, each on the ground there.
  const streak = SCREAM_HEADS.map(d => onGround(d, new Vector3()));
  effects.spawn('tails', c.scene, origin, {
    points: streak,
    laid: t => movesAt(t),
    across: s,
    across2: UP,
    width: cm(150),
    texture: TEX.inferno,
    maxTails: SCREAM_TAILS,
    seconds: ticks(SCREAM_STREAK_TICKS),
    intensity: t => Math.pow(1.3, -Math.max(0, Math.floor(movesAt(t)) - 16)),
  });
  const puff = new Vector3(x0 + f.x * cm(20), y0 + cm(3 + 20 - 45), z0 + f.z * cm(20));
  const s0 = (randInt(64) + 64) / 100;
  effects.spawn('sprite', c.scene, puff, {
    texture: TEX.powerWave,
    size: cm(64),
    seconds: ticks(29),
    roll: Math.random() * Math.PI * 2,
    follow: out => out.set(puff.x, puff.y + cm(5) * movesAt(fxNow() - t0), puff.z),
    sizeAt: p => s0 + 0.19 * movesAt(p * ticks(29)),
    // Light (30 - n) / 20 clamps at 1 until its last 20 ticks.
    fadeTail: 20 / 29,
  });

  // Per move: each live model drops a flame at its point before stepping on, at (Scale - 0.4) x 3.5,
  // and the claw then checks for contact (MoveHandlers.cpp:4642-4649).
  const at = new Vector3();
  let n = 0;
  let clawLive = true;
  const move = (): void => {
    n++;
    const before = SCREAM_STEP * (n - 1);
    if (clawLive) {
      screamFlame(c, onGround(cm(20) + before, at), f, (screamScale(0.9, 0.04, n) - 0.4) * 3.5, look);
      if (screamContact(c.caster, at)) {
        clawLive = false;
        claw.stop();
      }
    }
    screamFlame(c, onGround(before, at), f, (screamScale(2.3, 0.14, n) - 0.4) * 3.5, look);
    if (look && screamScale(2.3, 0.14, n) > 0) effects.spawn('particles', c.scene, at, { recipe: SCREAM_EMBERS, count: 2, height: 0.2 });
    if (n < SCREAM_MOVES) delay(TICK, move);
  };
  move();
  if (look) {
    // Ground contact: a flat fire glow under the fire model's burst, shrinking with it.
    effects.spawn('sprite', c.scene, origin, {
      texture: TEX.flare,
      colour: look.glow,
      size: 2.4,
      seconds: ticks(SCREAM_MOVES - 1),
      flat: true,
      height: 0.04,
      follow: out => onGround(SCREAM_STEP * movesAt(fxNow() - t0), out),
      sizeAt: p => 0.35 + screamScale(2.3, 0.14, movesAt(p * ticks(SCREAM_MOVES - 1))) / 2.3,
      fadeTail: 0.3,
    });
  }
  // The fire model's point, held where it stops.
  return out => onGround(SCREAM_STEP * Math.min(SCREAM_MOVES, movesAt(fxNow() - t0)), out);
}

/**
 * Fire Scream, 14 ticks after the packet (AttackTime 1 -> 15, ZzzCharacter.cpp:4132-4140), from where the
 * caster then stands: three pairs, and Darklord_firescream for everyone (:4547).
 */
const fireScream: Step = (_at, c) => {
  if (entityGone(c.caster)) return;
  const origin = entityPos(c.caster, 0, new Vector3());
  const yaw = yawDegrees(c);
  playCombat('Sound/Darklord_firescream', origin);
  for (const [turn, side] of SCREAM_PAIRS) screamPair(c, origin, yaw + turn, side);
};

// Fire Scream on the graded tiers: the same pairs, streaks and puffs; the flame cards lean orange, a little
// smaller and fade out instead of popping, embers rise off the fire, a glow rides under each burst, and one
// fire light follows the wall.

interface ScreamLook {
  flame: RGB;
  flameSize: number;
  flameFade: number;
  /** How far up a card is lifted, as a fraction of its edge at birth. */
  flameLift: number;
  glow: RGB;
}
/**
 * ~75 additive white Flame01 cards up to 3.9 m summed to a flat yellow-white wall on the graded frame
 * (78_port_enhanced); orange at 0.8 size they keep their shapes. Flame01 runs to its border, so the cards are
 * soft-edged and stand on the ground; the fade stands in for the x1/1.007 dimming.
 */
const SCREAM_LOOK: ScreamLook = { flame: [0.9, 0.44, 0.2], flameSize: 0.8, flameFade: 0.45, flameLift: 0.35, glow: [1, 0.4, 0.12] };
const SCREAM_EMBERS: ParticleRecipe = { ...SPLIT_EMBERS, box: [0.4, 0.15, 0.4], power: 2.5, life: 0.8 };

const fireScreamGraded = (skill: number): Step => (_at, c) => {
  if (entityGone(c.caster)) return;
  const origin = entityPos(c.caster, 0, new Vector3());
  const yaw = yawDegrees(c);
  playCombat('Sound/Darklord_firescream', origin);
  const heads = SCREAM_PAIRS.map(([turn, side]) => screamPair(c, origin, yaw + turn, side, SCREAM_LOOK));
  // The wall's light rides the centre fire a tile back over the burning flames, a tile up.
  const f = forwardOfDeg(yaw, new Vector3());
  const head = heads[0];
  lighting.skillStrike(c.scene, skill, {
    position: { x: origin.x, y: origin.y + 1, z: origin.z },
    follow: out => {
      const p = head(SCRATCH);
      out.x = p.x - f.x;
      out.y = p.y + 1;
      out.z = p.z - f.z;
    },
  });
};
const SCRATCH = new Vector3();

export default defineSkill({
  id: 78,
  name: "Fire Scream",
  // Master numbers cast, heard, lit and drawn as this skill (the original names them in its `case`).
  masterAliases: [518, 520],
  // The cast (ClassAttack.cpp:866-901) and the caster's own echo (WSclient.cpp:5180, `sc != Hero`) are silent;
  // it screams when the effect spawns.
  silentHeroCast: true,
  // 78 Fire Scream (DL): 14 ticks after the packet, 3 pairs MODEL_DARK_SCREAM + _FIRE at yaw and yaw ±10 moved ±80 cm
  // sideways, each with a ground streak, a puff and a flame card a tick (fireScream). Caster-anchored: 518 / 520 may
  // arrive as a targeted packet.
  visual: {
    area: after(ticks(STRIKE_MAX_TICKS), fireScream),
    enhanced: { area: (at, c) => after(ticks(STRIKE_MAX_TICKS), fireScreamGraded(baseSkill(currentSkill)))(at, c) },
  },
  sound: 'Sound/Darklord_firescream', // Fire Scream
  clip: { ground: A.PLAYER_ATTACK_STRIKE, ...MOUNTED_STRIKE }, // Fire Scream
  // Fire Scream: nothing, as the original (no AddTerrainLight on DARK_SCREAM, FLAME sub8 or BLUE_BLUR sub1).
  // Enhanced: one fire light riding the wall (three fanned fires ~2.5 tiles across) until its flames die down.
  light: { enhanced: { strike: effectLight([1, 0.5, 0.2], 2.5, 1.4, { release: 0.55, flicker: { min: 0.75, max: 1, steps: 4 } }) } },
});
