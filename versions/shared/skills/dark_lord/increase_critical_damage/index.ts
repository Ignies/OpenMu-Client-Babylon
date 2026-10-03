import { defineSkill } from '@/controllers/skills/define';
import { CAST_HEIGHT, ENHANCED_TIER, Step, TICK, after, atCaster, cm, ticks } from '@/controllers/skills/visuals';
import { COMBAT_BUS, playSfx } from '@/controllers/sound';
import { DEG } from '../../_shared';
import { type Entity } from '@/ecs/world';
import { GROUP_BOW, GROUP_SHIELD } from '@/controllers/actors/weaponClass';
import { LEFT_HAND_BONE, RIGHT_HAND_BONE } from '@/controllers/actors/weaponAttachment';
import { MODEL, TEX } from '@/controllers/fx/recipes';
import { boneLocalPos, bonePos, delay, entityGone, entityPos, type ParticleRecipe, type PointSource, type RGB } from '@/controllers/fx/core';
import { Vector3, type Scene } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';
import { muAngle, sfx } from '../_shared';
import { tierIndex } from '@/controllers/lighting/lightingQuality';

import { A } from '@/controllers/combat/recipes';
import { MOUNTED_HAND } from '../../_shared';

import { SkillLight } from '@/controllers/lighting/skills';
import { TICK_SECONDS } from '../../_shared';
import { effectLight } from '@/controllers/lighting/recipes';

/** MODEL_DARKLORD_SKILL sub0 / sub1: `Angle (45, 45 - 90 x SubType, 0)` (ZzzEffect.cpp:3449-3470). */
const CRIT_ANGLES = [muAngle(45, 45, 0), muAngle(45, -45, 0)] as const;
const CRIT_TINT: RGB = [1, 0.6, 0.3];
const ARROWS = 15;
const BOLT = 7;
/** eBuff_Cloaking: the buff pulse skips a cloaked body (ZzzCharacter.cpp:10030). */
const CLOAKING = 18;

interface CritHand {
  bone: number;
  sub: 0 | 1;
  bow: boolean;
}

/**
 * Weapon[0] (right, link bone 33) and Weapon[1] (left, 42) with Add Critical's skips: no card at a
 * right hand holding arrows, or a left hand holding bolts or a shield (ZzzCharacter.cpp:4370-4381).
 * `held`: the buff pulse also skips an empty hand (:10039, :10052).
 */
function critHands(e: Entity, held: boolean): CritHand[] {
  const right = e.charAppearance?.rightHand ?? null;
  const left = e.charAppearance?.leftHand ?? null;
  const out: CritHand[] = [];
  if ((!held || right) && !(right?.group === GROUP_BOW && right.num === ARROWS)) out.push({ bone: RIGHT_HAND_BONE, sub: 0, bow: right?.group === GROUP_BOW });
  if ((!held || left) && !(left?.group === GROUP_BOW && left.num === BOLT) && left?.group !== GROUP_SHIELD) out.push({ bone: LEFT_HAND_BONE, sub: 1, bow: left?.group === GROUP_BOW });
  return out;
}

/** MODEL_DARKLORD_SKILL: KingS_R at Scale 0.2 in the Light (1, 0.6, 0.3), 10 ticks, left where it was made (ZzzObject.cpp:948-953). */
function critCard(scene: Scene, e: Entity, hand: CritHand): void {
  effects.spawn('model', scene, bonePos(e, hand.bone, new Vector3(), CAST_HEIGHT), {
    model: MODEL.darkLordSkill,
    colour: CRIT_TINT,
    scale: 0.2,
    seconds: ticks(10),
    fadeTail: 0.001,
    ...CRIT_ANGLES[hand.sub],
  });
}

/** Graded tiers: hot chips the critical card throws off the hand. */
const CRIT_SPARKS: ParticleRecipe = {
  texture: TEX.spark2,
  colour: [1, 0.72, 0.38],
  colourEnd: [0.8, 0.25, 0.05],
  size: 0.1,
  sizeJitter: 0.4,
  life: 0.45,
  lifeJitter: 0.4,
  box: [0.04, 0.04, 0.04],
  dir1: [-1, -0.2, -1],
  dir2: [1, 1.2, 1],
  power: 2.2,
  powerJitter: 0.5,
  gravity: -3,
  capacity: 128,
};
/** Graded tiers: embers lifting off the buff's burning helices. */
const CRIT_EMBERS: ParticleRecipe = { ...CRIT_SPARKS, size: 0.08, life: 0.6, box: [0.15, 0.1, 0.15], dir1: [-0.3, 1, -0.3], dir2: [0.3, 1, 0.3], power: 0.6, gravity: 0.4, capacity: 256 };

/** Graded tiers: a hot core under the card at the hand and a spray of chips. */
function critHandFlare(scene: Scene, e: Entity, hand: CritHand): void {
  const follow: PointSource = out => bonePos(e, hand.bone, out, CAST_HEIGHT);
  const p = follow(new Vector3());
  effects.spawn('sprite', scene, p, { texture: TEX.flare, colour: [1, 0.55, 0.25], size: 0.9, seconds: ticks(10), growFrom: 0.4, grow: 1.3, fadeTail: 0.6, follow });
  effects.spawn('particles', scene, p, { recipe: CRIT_SPARKS, count: 10 });
}

/** Graded tiers: a warm glow in the hand under each pulse's helices, and embers lifting off them. */
function critPulseGlow(scene: Scene, e: Entity, hand: CritHand): void {
  const follow: PointSource = out => bonePos(e, hand.bone, out, CAST_HEIGHT);
  const p = follow(new Vector3());
  effects.spawn('sprite', scene, p, { texture: TEX.flare, colour: [0.55, 0.3, 0.12], size: 0.75, seconds: ticks(HELIX_MOVES), growFrom: 0.6, fadeTail: 0.45, follow });
  effects.spawn('particles', scene, p, { recipe: CRIT_EMBERS, rate: 14, seconds: ticks(HELIX_MOVES - 2), follow });
}

/** The skill at AttackTime 15, 14 ticks after the packet: a card at each hand and SOUND_CRITICAL (ZzzCharacter.cpp:4366-4383). `hd`: a hot core and sparks at each card. */
const critCastOf = (hd: boolean): Step => after(ticks(14), (at, c) => {
  if (entityGone(c.caster)) return;
  for (const hand of critHands(c.caster, false)) {
    critCard(c.scene, c.caster, hand);
    if (hd) critHandFlare(c.scene, c.caster, hand);
  }
  atCaster(sfx('Sound/sDarkCritical'))(at, c);
});
const critCast = critCastOf(false);

/** FLARE_FORCE sub5-7 move 16 times, one tail more each (ZzzEffectJoint.cpp:2551-2573, :6532-6592). */
const HELIX_MOVES = 16;
/** `Light x 1/1.5` a move once LifeTime is under 7. */
const helixLight = (k: number): number => (k >= 9 ? Math.pow(1.5, 8 - k) : 1);
/** Centimetres along the link bone's Y of axis point `i`: from +20, stepping back 4 cm growing 0.1 a point; a bow takes no step. */
const helixAlong = (i: number, bow: boolean): number => (bow ? 20 : 20 - 4 * (i + 1) - 0.05 * i * (i + 1));

const helixLocal = new Vector3();
const helixAxis = new Vector3();

/** A bone's frame axis `local` in the world, unit (the tail matrix `BoneTransform[0]`). */
function boneAxis(e: Entity, bone: number, local: Vector3, out: Vector3): boolean {
  const node = e.modelObject?.gltf?.skeleton?.bones[bone + 1]?.getTransformNode();
  if (!node) return false;
  Vector3.TransformNormalToRef(local, node.getWorldMatrix(), out);
  out.normalize();
  return true;
}

/**
 * One FLARE_FORCE sub5/6/7 on a hand, laid anew every move: point i steps down the link bone and
 * sits 30 cm out, the radius shrinking 0.15 cm a point over the whole joint's life, turned about the
 * world X axis from SubType x 90 deg by +-40 deg a point. Fire04, 20 cm wide, Light (1, 0.8, 1).
 */
function critHelix(scene: Scene, e: Entity, hand: CritHand, sub: 5 | 6 | 7): void {
  const points = Array.from({ length: HELIX_MOVES }, () => new Vector3());
  const turn = sub % 2 ? 40 : -40;
  effects.spawn('path', scene, bonePos(e, hand.bone, new Vector3(), CAST_HEIGHT), {
    points,
    texture: TEX.fire4,
    colour: [1, 0.8, 1],
    width: cm(20),
    seconds: ticks(HELIX_MOVES),
    life: p => helixLight(Math.floor(p * HELIX_MOVES)),
    rebuild: (t, pts, _widths, axes) => {
      if (entityGone(e)) return 0;
      const k = Math.min(HELIX_MOVES - 1, Math.floor(t / TICK));
      let r = 30 - (0.15 * k * (k + 1)) / 2;
      let a = sub * 90;
      for (let i = 0; i <= k; i++) {
        a += turn;
        const p = boneLocalPos(e, hand.bone, helixLocal.set(0, cm(helixAlong(i, hand.bow)), 0), pts[i], CAST_HEIGHT);
        // Rx(a) applied to (0, 0, r): MU (0, -r sin a, r cos a), MU y being this client's z.
        p.y += cm(r * Math.cos(a * DEG));
        p.z -= cm(r * Math.sin(a * DEG));
        r -= 0.15;
      }
      if (boneAxis(e, 0, helixAxis.set(1, 0, 0), axes.side)) boneAxis(e, 0, helixAxis.set(0, 0, 1), axes.up);
      return k + 1;
    },
  });
}

/** The BITMAP_FLARE (Flare.jpg, 64 px x `Light / 2`) each helix leaves on every second axis point, one per helix, stacked. */
function critFlares(scene: Scene, e: Entity, hand: CritHand): void {
  for (let i = 0; i < HELIX_MOVES; i += 2) {
    const along = cm(helixAlong(i, hand.bow));
    const follow: PointSource = out => boneLocalPos(e, hand.bone, helixLocal.set(0, along, 0), out, CAST_HEIGHT);
    const life = HELIX_MOVES - i;
    delay(ticks(i), () => {
      if (entityGone(e)) return;
      effects.spawn('sprite', scene, follow(new Vector3()), { texture: TEX.flareBig, colour: [1, 0.8, 1], size: cm(32), count: 3, seconds: ticks(life), fadeTail: Math.min(1, 7 / life), follow });
    });
  }
}

/**
 * Critical Damage's body look, every 1.2 s while it holds and the body is not cloaked
 * (ZzzCharacter.cpp:10029-10066): at each hand holding an item, BITMAP_FLARE_FORCE sub1 (three
 * helices, ZzzEffect.cpp:3431-3436) and, 1 time in 20, the MODEL_DARKLORD_SKILL card; SOUND_CRITICAL.
 */
function critPulse(scene: Scene, e: Entity): void {
  if (!e.charAppearance || e.buffs?.has(CLOAKING) || entityGone(e)) return;
  const card = Math.floor(Math.random() * 20) === 0;
  // PKKey is the weapon type, and it stays set once a bow was seen (right hand first).
  let bow = false;
  const hd = tierIndex() >= ENHANCED_TIER;
  for (const hand of critHands(e, true)) {
    bow = bow || hand.bow;
    const h = { ...hand, bow };
    for (const sub of [5, 6, 7] as const) critHelix(scene, e, h, sub);
    critFlares(scene, e, h);
    if (card) critCard(scene, e, h);
    if (hd) critPulseGlow(scene, e, h);
  }
  if (hd) lighting.skillCue(scene, 64, 'pulse', e);
  playSfx('Sound/sDarkCritical', entityPos(e, CAST_HEIGHT, new Vector3()), { bus: COMBAT_BUS });
}

/**
 * Increase Critical Damage: the original lights nothing. On the graded tiers the orange KingS_R cards
 * light the hands at AttackTime 15, and each buff pulse's Fire04 helices (30 cm round the hand, 16
 * ticks) light them again, riding the body.
 */
const CRIT_LIGHT: SkillLight = {
  enhanced: {
    timed: [
      { ...effectLight([1, 0.6, 0.3], 0.8, 10 * TICK_SECONDS, { attack: 1 * TICK_SECONDS, release: 6 * TICK_SECONDS, heightOffset: 1.1 }), delay: 14 * TICK_SECONDS, ride: true },
      { ...effectLight([1, 0.7, 0.4], 0.6, 16 * TICK_SECONDS, { attack: 3 * TICK_SECONDS, release: 7 * TICK_SECONDS, heightOffset: 1.1, flicker: { min: 0.75, max: 1, steps: 3 } }), delay: 0, cue: 'pulse', ride: true },
    ],
  },
};

export default defineSkill({
  id: 64,
  name: "Increase Critical Damage",
  // Master numbers cast, heard, lit and drawn as this skill (the original names them in its `case`).
  masterAliases: [511, 515, 517, 522],
  // 64 Add Critical (Increase Critical Damage; 511/515/517/522): at AttackTime 15 a MODEL_DARKLORD_SKILL at each weapon's
  // link bone and SOUND_CRITICAL (ZzzCharacter.cpp:4366-4383). The lasting look is BUFF_VISUALS[5].
  visual: { impact: critCast, area: critCast, enhanced: { impact: critCastOf(true), area: critCastOf(true) } },
  buffs: {
    // 5 Critical Damage Increase (148 its mastery): the weapon helices every 1.2 s (critPulse).
    5: (e, s) => ({ pulse: { every: 1.2, fire: () => critPulse(s, e) } }),
    148: (e, s) => ({ pulse: { every: 1.2, fire: () => critPulse(s, e) } }),
  },
  clip: { ground: A.PLAYER_SKILL_HAND1, ...MOUNTED_HAND }, // Increase Critical Damage
  // Increase Critical Damage (511 / 515 / 517 / 522 through the aliases), Removal Buff, Iron Defense: graded tiers only.
  light: CRIT_LIGHT,
});
