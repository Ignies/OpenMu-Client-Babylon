import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { entityPos, entityYaw, fxNow, type ParticleRecipe, type PointSource, type RGB } from '@/controllers/fx/core';
import { heroSkillEffect, type ModelOptions } from '@/controllers/fx/model';
import { SkillContext, Step, TICK, cm, facing, perTick, repeat, ticks } from '@/controllers/skills/visuals';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { dw2AtAttackTime } from '../_shared';
import { dw2Sfx, groundAt, lightFollow } from '../../_shared';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';

import { EFFECT_LUMINOSITY } from '@/controllers/lighting/skills';
import { TICK_SECONDS } from '../../_shared';
import { effectLight } from '@/controllers/lighting/recipes';

/** MODEL_STORM sub0: LT 59, Direction (0,-10,0) by the caster's Angle, re-seated on the terrain every tick (ZzzEffect.cpp:2000-2009, MoveHandlers.cpp:3412). */
const TWISTER_TICKS = 59;
const TWISTER_SPEED = perTick(10);
/** Default `Scale` 0.9 (ZzzEffect.cpp:361-364); `BlendMeshLight = LifeTime * 0.1` fades the last 10 ticks. */
const TWISTER_SCALE = 0.9;
/** `BlendMeshTexCoordU = -LifeTime * 0.1`: +0.1 U a tick. */
const TWISTER_UV = 0.1 * 25;
/** JOINT_THUNDER sub0 from +-200 cm world X, 700 up, onto the storm + 80 (MoveHandlers.cpp:3397-3406, ZzzEffectJoint.cpp:4786). */
const TWISTER_BOLT_SIDE = cm(200);
const TWISTER_BOLT_UP = cm(700);
const TWISTER_BOLT_AIM = cm(80);
/** The bolt's `Scale` 10 is its width in cm. */
const TWISTER_BOLT_WIDTH = cm(10);

/**
 * BITMAP_SMOKE sub3, one a tick at the storm's base: LT 10, Scale 0.8-1.11 of the 64 px smoke01, +0.1 a tick,
 * thrown 40-47 cm a tick at a random yaw and +-45 deg pitch and braked x0.4 a tick (about 70 cm in all),
 * Light (0.8, 0.8, 1) x LifeTime / 8 (ZzzEffectParticle.cpp:1250-1256, :5330-5335).
 */
const TWISTER_SMOKE: ParticleRecipe = {
  texture: TEX.smoke,
  colour: [0.8, 0.8, 1],
  colourEnd: [0, 0, 0],
  size: 0.61,
  sizeJitter: 0.1,
  life: ticks(10),
  dir1: [-1, -0.7, -1],
  dir2: [1, 0.7, 1],
  power: 1.75,
  gravity: 0,
  endScale: 2,
  spin: 1,
  blend: 'add',
};

/** The storm's path: its start and facing fixed when it is made, its height the terrain's under it. */
function twisterPath(c: SkillContext): PointSource {
  const start = entityPos(c.caster, 0, new Vector3());
  const dir = facing(c);
  const t0 = fxNow();
  return out => {
    const t = fxNow() - t0;
    out.set(start.x + dir.x * TWISTER_SPEED * t, 0, start.z + dir.z * TWISTER_SPEED * t);
    out.y = groundAt(out.x, out.z, start.y);
    return out;
  };
}

/** What the graded tiers lay over the storm: at its moving base once, and on each tick a bolt strikes it. */
interface TwisterExtra {
  base: (storm: PointSource, c: SkillContext) => void;
  bolt: (top: PointSource, c: SkillContext) => void;
}

/**
 * Twister at AttackTime 15 (ZzzCharacter.cpp:4494-4497, MoveHandlers.cpp:3384-3428): MODEL_STORM at the caster's
 * feet walking its facing, and every tick one smoke puff, a 50 % chance of a bolt from each side and a 25 %
 * chance of a thrown stone. SOUND_STORM with it; the ground under it darkens (SKILL_LIGHTS 8).
 */
const twisterWith = (extra?: TwisterExtra): Step => (_at, c) => {
  const storm = twisterPath(c);
  const at = storm(new Vector3());
  const top: PointSource = out => {
    storm(out);
    out.y += TWISTER_BOLT_AIM;
    return out;
  };
  const funnel: ModelOptions = {
    model: MODEL.storm,
    seconds: ticks(TWISTER_TICKS),
    scale: TWISTER_SCALE,
    colour: RGBS.white,
    follow: storm,
    yaw: -entityYaw(c.caster),
    fadeTail: 10 / TWISTER_TICKS,
    scrollU: TWISTER_UV,
  };
  effects.spawn('model', c.scene, at, heroSkillEffect(funnel, c.caster));
  effects.spawn('particles', c.scene, at, { recipe: TWISTER_SMOKE, rate: 25, seconds: ticks(TWISTER_TICKS), follow: storm });
  lighting.skillSpot(c.scene, 8, 'storm', lightFollow(storm));
  dw2Sfx('Sound/sTornado', at);
  extra?.base(storm, c);
  const p = new Vector3();
  repeat(TWISTER_TICKS, TICK, () => {
    storm(p);
    let struck = false;
    for (const side of [-TWISTER_BOLT_SIDE, TWISTER_BOLT_SIDE]) {
      if (Math.random() >= 0.5) continue;
      struck = true;
      const from = new Vector3(p.x + side, p.y + TWISTER_BOLT_UP, p.z);
      effects.spawn('joint', c.scene, from, { to: top, colour: RGBS.white, seconds: ticks(2), width: TWISTER_BOLT_WIDTH, jitter: 0.1, fadeTail: 0.01, texture: TEX.jointThunder, textureRepeats: 2, textureScroll: 1 });
    }
    if (struck) extra?.bolt(top, c);
    if (Math.random() < 0.25) effects.spawn('debris', c.scene, p, { model: Math.random() < 0.5 ? MODEL.stone : MODEL.stone2, colour: RGBS.white });
  })(at, c);
};
const twister = twisterWith();

// dw2 on the graded tiers: the same effects, with ground contact, sparks and glow that read after the tone curve.

/** Sand the storm drags off the ground, rolling out of its base and rising a little. Additive: alpha dust read as a dark stain after the tone curve. */
const TWISTER_DUST: ParticleRecipe = {
  texture: TEX.smoke,
  colour: [0.3, 0.27, 0.22],
  colourEnd: [0.12, 0.1, 0.08],
  size: 0.8,
  sizeJitter: 0.3,
  life: 0.9,
  lifeJitter: 0.3,
  box: [0.3, 0.05, 0.3],
  dir1: [-1, 0.15, -1],
  dir2: [1, 0.6, 1],
  power: 1.6,
  gravity: 0.4,
  endScale: 2.2,
  spin: 2,
  blend: 'add',
  capacity: 128,
};
/** Where a bolt meets the storm: a short blue-white flare at the aim point. */
const TWISTER_STRIKE: RGB = [0.75, 0.82, 1];

/**
 * Enhanced Twister: a second, slightly narrower funnel inside the first (one sheet reads faint on the graded buffer, and
 * Babylon clamps the tint at 1), a dust skirt and a turning shock ring dragged along under it, a flare where the bolts strike.
 */
const twisterGraded = twisterWith({
  base: (storm, c) => {
    const at = storm(new Vector3());
    effects.spawn('model', c.scene, at, { model: MODEL.storm, seconds: ticks(TWISTER_TICKS), scale: TWISTER_SCALE * 0.88, colour: RGBS.white, follow: storm, yaw: -entityYaw(c.caster) + 1, fadeTail: 10 / TWISTER_TICKS, scrollU: TWISTER_UV });
    effects.spawn('particles', c.scene, at, { recipe: TWISTER_DUST, rate: 20, seconds: ticks(TWISTER_TICKS - 10), follow: storm });
    effects.spawn('ring', c.scene, at, { texture: TEX.shockwave, colour: [0.95, 0.85, 0.7], scale: 2.6, growFrom: 0.6, grow: 1, spin: 300, seconds: ticks(TWISTER_TICKS), fadeTail: 10 / TWISTER_TICKS, follow: storm });
  },
  bolt: (top, c) => {
    effects.spawn('sprite', c.scene, top(new Vector3()), { texture: TEX.flare, colour: TWISTER_STRIKE, size: 1.2, seconds: ticks(3), follow: top, fadeTail: 1 });
  },
});

export default defineSkill({
  id: 8,
  name: "Twister",
  // 8 Twister: MODEL_STORM walking the caster's facing at AttackTime 15, with its smoke, bolts and stones (`twister`); Enhanced `twisterGraded`.
  visual: { area: dw2AtAttackTime(twister), enhanced: { area: dw2AtAttackTime(twisterGraded) } },
  // Twister: MODEL_STORM takes (0.4, 0.3, 0.2) x Luminosity off the ground in range 5 under itself for its
  // 59 ticks (MoveHandlers.cpp:3413-3414). Negative: the tile map clamps it away on Classic, as characters.ts says;
  // the graded tiers' point light blacked out a hole round the storm, so they take the enhanced light instead.
  light: {
    spots: { storm: { color: [-0.4, -0.3, -0.2], range: 5, seconds: 59 * TICK_SECONDS, release: TICK_SECONDS, flicker: EFFECT_LUMINOSITY } },
    // Enhanced: the white funnel and its bolts light the ground round it as it walks, flickering as MoveEffect's Luminosity.
    enhanced: { spots: { storm: effectLight([0.8, 0.85, 1], 1.2, 59 * TICK_SECONDS, { release: 10 * TICK_SECONDS, flicker: EFFECT_LUMINOSITY }) } },
  },
});
