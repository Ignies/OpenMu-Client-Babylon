import { defineSkill } from '@/controllers/skills/define';
import { type BoneGlow } from '@/controllers/fx/aura';
import { BuffLook, CAST_HEIGHT, IMPACT_HEIGHT, Step, TICK, after, cm, repeat, seq, ticks } from '@/controllers/skills/visuals';
import { CLOAK_EFFECT } from '../_shared';
import { type Entity } from '@/ecs/world';
import { MODEL, TEX } from '@/controllers/fx/recipes';
import { bonePos, entityPos, entityYaw, followEntity, fxNow, type ParticleRecipe, type PointSource, type RGB } from '@/controllers/fx/core';
import { type RingOptions } from '@/controllers/fx/ring';
import { Vector3, type Scene } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';

import { A } from '@/controllers/combat/recipes';

import { SkillLight } from '@/controllers/lighting/skills';
import { effectLight } from '@/controllers/lighting/recipes';

/** MODEL_ARROWSRE06 sub1's Light (0.2, 0.2, 0.9) (ZzzEffect.cpp:8191, :8309). */
const RUNE_LIGHT: RGB = [0.2, 0.2, 0.9];
const RUNE_TICKS = 40;
/** Scale 0.9 (the CreateEffect default, ZzzEffect.cpp:361-364) x1.05 a tick while LT >= 15, then x0.95 (:8226-8236). */
const RUNE_PEAK = 0.9 * Math.pow(1.05, 26);
const runeScale = (t: number): number => {
  const n = t / TICK;
  return n <= 26 ? 0.9 * Math.pow(1.05, n) : RUNE_PEAK * Math.pow(0.95, n - 26);
};
/** The last 10 ticks: Alpha x0.95 (ZzzEffect.cpp:8241) and BlendMeshLight x0.8 (ZzzObject.cpp:1903) a tick. */
const runeLight = (t: number): number => {
  const n = t / TICK;
  return n < RUNE_TICKS - 10 ? 1 : Math.pow(0.95 * 0.8, n - (RUNE_TICKS - 10));
};

/**
 * One MODEL_ARROWSRE06 sub1 on each hand, bones 28 and 37: the rune grows 0.9 -> 3.2 -> 1.56 and carries
 * two BITMAP_LIGHT cards, Scale and 0.8 Scale x 64 cm, every tick of its life (ZzzEffect.cpp:8226-8243).
 */
function handRunes(scene: Scene, e: Entity): void {
  for (const bone of HAND_BONES) {
    const at: PointSource = out => bonePos(e, bone, out, CAST_HEIGHT);
    const p = at(new Vector3());
    effects.spawn('model', scene, p, { model: MODEL.arrowsRe06, seconds: ticks(RUNE_TICKS), colour: RUNE_LIGHT, follow: at, loop: false, yaw: entityYaw(e), scaleAt: runeScale, intensity: runeLight, fadeTail: 0 });
    for (const k of [1, 0.8]) {
      effects.spawn('sprite', scene, p, { texture: TEX.flare, colour: RUNE_LIGHT, size: cm(64) * k, sizeAt: p => runeScale(p * ticks(RUNE_TICKS)), seconds: ticks(RUNE_TICKS), follow: at, fadeTail: 0 });
    }
  }
}

/** MODEL_SWELL_OF_MAGICPOWER's LifeTime (ZzzEffect.cpp:673-679). */
const SWELL_TICKS = 45;
/** Its BlendMeshLight x0.86 a tick over the last 20 (ZzzObject.cpp:1893-1896). */
const swellLight = (t: number): number => {
  const n = t / TICK;
  return n < SWELL_TICKS - 20 ? 1 : Math.pow(0.86, n - (SWELL_TICKS - 21));
};
/** The ground decals' Light (0.4, 0.3, 0.9), ramped to x1.1 by PKKey (MoveHandlers.cpp:5736-5752). */
const SWELL_DECAL: RGB = [0.44, 0.33, 0.99];
/** 2line_gost ribbons: Light (0.3, 0.2, 0.9) (ZzzEffect.cpp:8200). */
const SWELL_GHOST: RGB = [0.3, 0.2, 0.9];
/** BITMAP_LIGHT on every bone over the last 20 ticks, Scale 1.5, (0.7, 0.3, 0.9) x LT x 0.05 (ZzzEffect.cpp:8176-8187). */
const SWELL_BONE_LIGHT: RGB = [0.7, 0.3, 0.9];

/**
 * BITMAP_SHOCK_WAVE sub14 twice and BITMAP_TWLIGHT sub3 on the ground under the caster (ZzzEffect.cpp:8167-8172):
 * 5 -> 0.5 and 6 -> 1.5 tiles across over 30 ticks, the twilight turning 10 degrees a tick, light ramping in
 * over the first 10 ticks and out over the last 10 (MoveHandlers.cpp:5716-5760, 5838-5854).
 */
const swellDecals: Step = (_at, c) => {
  const follow = followEntity(c.caster, 0);
  const at = entityPos(c.caster, 0, new Vector3());
  const shock: RingOptions = { texture: TEX.shockwave, colour: SWELL_DECAL, scale: 5, grow: 0.1, seconds: ticks(30), fadeIn: 1 / 3, fadeTail: 1 / 3, follow };
  effects.spawn('ring', c.scene, at, shock);
  effects.spawn('ring', c.scene, at, shock);
  effects.spawn('ring', c.scene, at, { texture: TEX.twilight, colour: SWELL_DECAL, scale: 6, grow: 0.25, spin: 250, seconds: ticks(30), fadeIn: 1 / 3, fadeTail: 1 / 3, follow });
};

const GHOST_CLOSE = cm(60);
const GHOST_SWERVE = (65 * Math.PI) / 180;
const GHOST_PITCH_RATE = (3 * Math.PI) / 180 / TICK;

/**
 * One BITMAP_2LINE_GHOST sub1 (ZzzEffectJoint.cpp:624-645, 3721-3740): starts 300 cm out at a random angle,
 * aims at the caster's spot at its own height +/- 1..100 cm, flies 20-29 cm a tick on a heading 65 degrees
 * off the bearing (an inward spiral), pitch easing 3 degrees a tick, circling within 60 cm. The original
 * starts at absolute z 200-299; here that is 2-3 tiles over the caster's feet, so it reads on any ground.
 */
const swellGhost: Step = (_at, c) => {
  const centre = entityPos(c.caster, 0, new Vector3());
  const a = Math.random() * Math.PI * 2;
  const pos = new Vector3(centre.x + Math.cos(a) * cm(300), centre.y + cm(200 + Math.floor(Math.random() * 100)), centre.z + Math.sin(a) * cm(300));
  const targetY = pos.y + cm(1 + Math.floor(Math.random() * 100)) * (Math.random() < 0.5 ? 1 : -1);
  const speed = cm(20 + Math.floor(Math.random() * 10)) / TICK;
  let pitch = 0;
  let last = fxNow();
  const head: PointSource = out => {
    const now = fxNow();
    const dt = now - last;
    last = now;
    if (dt > 0) {
      const dx = centre.x - pos.x;
      const dz = centre.z - pos.z;
      const dist = Math.hypot(dx, dz);
      const heading = Math.atan2(dz, dx) - (dist > GHOST_CLOSE ? GHOST_SWERVE : Math.PI / 2);
      if (dist > GHOST_CLOSE) {
        const step = GHOST_PITCH_RATE * dt;
        pitch += Math.max(-step, Math.min(step, Math.atan2(targetY - pos.y, dist) - pitch));
      }
      const d = speed * dt;
      pos.x += Math.cos(heading) * Math.cos(pitch) * d;
      pos.z += Math.sin(heading) * Math.cos(pitch) * d;
      pos.y += Math.sin(pitch) * d;
    }
    return out.copyFrom(pos);
  };
  effects.spawn('joint', c.scene, pos, {
    head,
    maxTails: 15,
    width: cm(20 + Math.floor(Math.random() * 10)),
    colour: SWELL_GHOST,
    seconds: ticks(25 + Math.floor(Math.random() * 10)),
    texture: TEX.twoLineGhost,
    fadeTail: 0,
  });
};

/** The violet flare on every bone from tick 25, LT x 0.05 going 1 -> 0.05 (ZzzEffect.cpp:8176-8187). */
const swellBoneLights = (colour: RGB): Step => (_at, c) => {
  const bones = Math.max(0, (c.caster.modelObject?.gltf?.skeleton?.bones.length ?? 0) - 1);
  for (let i = 0; i < bones; i++) {
    const at: PointSource = out => bonePos(c.caster, i, out);
    effects.spawn('sprite', c.scene, at(new Vector3()), { texture: TEX.flare, colour, size: cm(64) * 1.5, seconds: ticks(20), follow: at, fadeTail: 1 });
  }
};

/**
 * Expansion of Wizardry, any caster (WSclient.cpp:4950-4964, ZzzEffect.cpp:8157-8205): MODEL_SWELL_OF_MAGICPOWER
 * on him for 45 ticks - Scale 0.9, BodyLight (0.7, 0.4, 0.9) (the render overrides the create Light,
 * ZzzObject.cpp:1888-1897) - which at ticks 0, 10, 20 lays the ground decals, on tick 0 puts a rune on each
 * hand, over ticks 0-15 sheds two ghost ribbons a tick and from tick 25 lights every bone.
 */
const swellWith = (body: RGB, boneLight: RGB): Step => (at, c) => {
  effects.spawn('model', c.scene, entityPos(c.caster, 0, new Vector3()), {
    model: MODEL.magicPowerUp,
    seconds: ticks(SWELL_TICKS),
    scale: 0.9,
    colour: body,
    follow: followEntity(c.caster, 0),
    yaw: entityYaw(c.caster),
    fadeTail: 0,
    intensity: swellLight,
  });
  repeat(3, ticks(10), swellDecals)(at, c);
  handRunes(c.scene, c.caster);
  repeat(16, TICK, seq(swellGhost, swellGhost))(at, c);
  after(ticks(SWELL_TICKS - 20), swellBoneLights(boneLight))(at, c);
};
const swellOfMagic = swellWith([0.7, 0.4, 0.9], SWELL_BONE_LIGHT);

/** Swell tints held saturated: the Classic (0.7, 0.4, 0.9) body and bone light wash to pink-white on the graded buffer. */
const SWELL_BODY_GRADED: RGB = [0.5, 0.25, 0.95];
const SWELL_BONE_GRADED: RGB = [0.3, 0.12, 1];
/** Violet sparks lifting off the gathering decals over the ghosts' 16 ticks. */
const SWELL_EMBERS: ParticleRecipe = {
  texture: TEX.flare,
  colour: [0.6, 0.35, 1],
  colourEnd: [0.25, 0.1, 0.6],
  size: 0.28,
  sizeJitter: 0.4,
  life: 0.9,
  lifeJitter: 0.3,
  power: 1.1,
  powerJitter: 0.4,
  gravity: 0.4,
  box: [1.6, 0.05, 1.6],
  dir1: [-0.15, 1, -0.15],
  dir2: [0.15, 1, 0.15],
  endScale: 0.3,
};

/**
 * Enhanced Expansion of Wizardry: the same effect in saturated violet, embers rising off the decals while
 * the ghosts gather, and a flare at the chest as the bone lights take over at tick 25.
 */
const swellEnhanced: Step = (at, c) => {
  swellWith(SWELL_BODY_GRADED, SWELL_BONE_GRADED)(at, c);
  const feet = followEntity(c.caster, 0);
  effects.spawn('particles', c.scene, feet(new Vector3()), { recipe: SWELL_EMBERS, rate: 40, seconds: ticks(20), follow: feet });
  after(ticks(SWELL_TICKS - 20), (_p, k) => {
    const chest = followEntity(k.caster, IMPACT_HEIGHT);
    effects.spawn('sprite', k.scene, chest(new Vector3()), { texture: TEX.flare, colour: [0.55, 0.3, 1], size: 1.8, seconds: 0.5, grow: 1.3, growFrom: 0.4, fadeTail: 0.7, follow: chest });
  })(at, c);
};
/** Bip01 R Hand 28, L Hand 37: where the crit flare and the magic rune land. */
const HAND_BONES = [28, 37] as const;
/** Swell of Magic Power: BITMAP_LIGHT 1.8 on every bone, `(0.7, 0.3, 0.9) * (|sin t| + 0.2) * 0.5` (ZzzEffect.cpp:9316). */
const MAGIC_GLOW: BoneGlow = { bones: 'all', texture: TEX.flare, colour: [0.7, 0.3, 0.9], size: 1.15, breathe: t => (Math.abs(Math.sin(t)) + 0.2) * 0.5 };

/**
 * Swell of Magic Power's buff look: every bone glows, and every 6 s from 6 s after it lands the hand runes
 * (ZzzEffect.cpp:8298-8316, :9307-9328). None on a cloaked body (ZzzCharacter.cpp:10950-10965).
 */
const swellBuff: BuffLook = (e, s) =>
  e.buffs?.has(CLOAK_EFFECT) ? {} : { boneGlow: MAGIC_GLOW, pulse: { every: 6, first: 6, fire: () => handRunes(s, e) } };

/** Expansion of Wizardry's: the hand runes' blue, and the violet decals gathering from 3 tiles in over the 45 ticks. */
export const SWELL_LIGHT: Omit<SkillLight, 'enhanced'> = {
  cast: effectLight([0.2, 0.2, 0.9], 1, 1.6, { release: 0.6 }),
  impact: effectLight([0.55, 0.3, 1], 2.5, 1.8, { attack: 0.2, release: 0.9 }),
};

export default defineSkill({
  id: 233,
  name: "Expansion of Wizardry",
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [380, 383],
  // ReceiveMagicFinish drops eBuff_SwellOfMagicPower (WSclient.cpp:3978-3982).
  effect: 82,
  // 233 Expansion of Wizardry: MODEL_SWELL_OF_MAGICPOWER at the caster, Light (0.3,0.2,0.9) (WSclient.cpp
  // AT_SKILL_SWELL_OF_MAGICPOWER cast).
  // 233 Expansion of Wizardry (380 / 383 alias): see swellOfMagic. Enhanced adds the old mote burst.
  visual: { impact: swellOfMagic, area: swellOfMagic, enhanced: { impact: swellEnhanced, area: swellEnhanced } },
  buffs: {
    // 0x52 Wiz Enhance / Swell of Magic Power (138 / 139 its strengthener and mastery): every bone glows violet, a rune on the hands every 6 s.
    82: swellBuff,
    138: swellBuff,
    139: swellBuff,
  },
  sound: 'Sound/SwellofMagicPower', // Expansion of Wizardry
  clip: { ground: A.PLAYER_SKILL_SWELL_OF_MP }, // Expansion of Wizardry (WSclient.cpp:4562)
  // Expansion of Wizardry (380 / 383 its master rows): no terrain light in the original; Enhanced only. The
  // rows also keep the stale Wizardry type's cast flash off 380 / 383.
  light: { enhanced: SWELL_LIGHT },
  target: 'self',
});
