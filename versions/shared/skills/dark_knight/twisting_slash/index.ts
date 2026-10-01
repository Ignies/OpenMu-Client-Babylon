import { defineSkill } from '@/controllers/skills/define';
import { DEG, whenClipKey } from '../../_shared';
import { ITEM_LIGHT, JOINT_SPARKS_HD, SPARK_CHIPS_HD, itemScale, jointSpark, muAngles, rand, sayAt, sparkHeading, wieldedWeapon } from '../_shared';
import { delay, entityGone, entityPos, entityYaw, fxNow, type ParticleRecipe, type PointSource, type RGB } from '@/controllers/fx/core';
import { PlayerAction } from '../../../objects/enum';
import { SkillContext, Step, TICK, baseSkill, cm, currentSkill, forwardOf, perTick, ticks } from '@/controllers/skills/visuals';
import { TEX } from '@/controllers/fx/recipes';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { inHellas } from '@/controllers/actors/locomotion';
import { itemObjectAttribute } from '@/controllers/actors/itemObjectAttribute';
import { lighting } from '@/controllers/lighting';
import { storeRef } from '@/app/storeRef';

import { A } from '@/controllers/combat/recipes';

/**
 * BITMAP_SMOKE sub3 (ZzzEffectParticle.cpp:1250-1255, :5330-5335): LT 10, Scale 0.8-1.1 of the 64-texel
 * smoke01 growing 0.1 a tick, thrown 40-47 cm along a random heading pitched +-45° and slowing x0.4 a tick,
 * Light (0.8, 0.8, 1) x LifeTime / 8.
 */
const WHEEL_SMOKE: ParticleRecipe = {
  texture: TEX.smoke,
  colour: [0.8, 0.8, 1],
  size: cm(64) * 0.95,
  sizeJitter: 0.15,
  life: ticks(10),
  lifeJitter: 0,
  endScale: 2,
  box: [0, 0, 0],
  dir1: [-1, -0.7, -1],
  dir2: [1, 0.7, 1],
  power: 1.7,
  powerJitter: 0.1,
  spin: 0,
};

/**
 * In Hellas the sparks become BITMAP_WATERFALL_5 sub3 spray 120 cm up (MoveHandlers.cpp:2816-2827;
 * ZzzEffectParticle.cpp:3432-3437, :8407-8412): LT 20, 64 texels x 1.6, Light 0.5, 7-11 cm a tick down
 * along the orbit's pitched +-30° heading, turning 4° a tick.
 */
const WHEEL_SPRAY: ParticleRecipe = {
  texture: 'Effect/waterFall5.OZJ',
  colour: [0.5, 0.5, 0.5],
  size: cm(64) * 1.6,
  sizeJitter: 0,
  life: ticks(20),
  lifeJitter: 0,
  endScale: 0.94,
  box: [0.1, 0, 0.1],
  dir1: [-0.5, -1, -0.5],
  dir2: [0.5, -0.85, 0.5],
  power: perTick(9),
  powerJitter: 2 / 9,
  spin: 4 * DEG * 25,
  capacity: 200,
};

/** MODEL_SKILL_WHEEL2's alpha per copy: SubType `4 - LifeTime` of WHEEL1 runs -1..3 (MoveHandlers.cpp:2772-2800). */
const WHEEL_ALPHAS = [1, 1, 0.6, 0.5, 0.4];
/**
 * Graded tiers: smoke01 is an additive square that the tone curve lifts to a grey slab over the grass; the
 * same puff as a soft dust cloud with real alpha, kicked low along the ground under each copy.
 */
const WHEEL_DUST: ParticleRecipe = {
  texture: TEX.smokeAlpha,
  softEdge: true,
  colour: [0.42, 0.38, 0.33],
  colourEnd: [0.3, 0.27, 0.24],
  size: 0.55,
  sizeJitter: 0.3,
  life: 0.7,
  lifeJitter: 0.3,
  endScale: 2.2,
  box: [0.15, 0, 0.15],
  dir1: [-1, 0.1, -1],
  dir2: [1, 0.5, 1],
  power: 0.9,
  powerJitter: 0.4,
  spin: 1,
  blend: 'alpha',
  capacity: 192,
};
/** Graded tiers: the flare01 glow warmer and smaller, so it no longer blows out the grass under it. */
const WHEEL_GLOW_HD: RGB = [0.85, 0.62, 0.4];
/** Graded tiers: the band each copy sweeps, the blade's reach either side of its orbit, at its height. */
const WHEEL_SWEEP_HALF = 0.45;
const WHEEL_SWEEP: RGB = [0.34, 0.38, 0.48];

/**
 * One MODEL_SKILL_WHEEL2 (MoveHandlers.cpp:2779-2857, RenderWheelWeapon ZzzEffect.cpp:8616-8648): LT 25,
 * 150 cm ahead of the owner (180 with a spear) at an `Angle[2]` that starts at the cast facing and turns
 * -18° a tick; drawn 100 cm up with `Angle[1] = 90` (the blade flat) and an extra yaw of -30° per tick on
 * top. Every tick under it: one smoke, four sparks trailing the turn, a flare01 glow and the grey light.
 */
function wheelCopy(c: SkillContext, skill: number, yaw0: number, radius: number, weapon: ReturnType<typeof wieldedWeapon>, alpha: number, hd: boolean): void {
  const caster = c.caster;
  const t0 = fxNow();
  const age = (): number => (fxNow() - t0) / TICK;
  const orbit = (): number => yaw0 - 18 * DEG * age();
  const ground: PointSource = out => {
    entityPos(caster, 0, out);
    const f = forwardOf(orbit());
    out.x += f.x * radius;
    out.z += f.z * radius;
    return out;
  };
  const seconds = ticks(25);
  const start = ground(new Vector3());
  const hellas = inHellas(storeRef().world?.mapIndex ?? -1);
  if (weapon) {
    effects.spawn('model', c.scene, start, {
      model: weapon.file,
      seconds,
      scale: itemScale(weapon),
      alpha,
      fadeTail: 0,
      native: { light: ITEM_LIGHT, stamp: weapon.stamp, ...itemObjectAttribute(weapon.group, weapon.num) },
      follow: out => {
        ground(out);
        out.y += 1;
        return out;
      },
      rotate: out => muAngles(out, 0, 90 * DEG, orbit() - 30 * DEG * (age() + 1)),
    });
  }
  const glow = hd ? { colour: WHEEL_GLOW_HD, size: cm(64) * 1.5 } : { colour: [1, 0.8, 0.6] as RGB, size: cm(64) * 2 };
  effects.spawn('sprite', c.scene, start, { texture: TEX.flare, ...glow, seconds, fadeTail: 0.05, height: cm(hellas ? 60 : 20), follow: ground });
  if (hd) {
    // Graded tiers: the band the whirling blade sweeps, so the five copies read as one wheel.
    const band = (r: number): PointSource => out => {
      entityPos(caster, 1, out);
      const f = forwardOf(orbit());
      out.x += f.x * r;
      out.z += f.z * r;
      return out;
    };
    const w = alpha * 0.8 + 0.2;
    effects.spawn('blur', c.scene, start, {
      follow: band(radius + WHEEL_SWEEP_HALF),
      base: band(radius - WHEEL_SWEEP_HALF),
      texture: TEX.swordBlur,
      colour: [WHEEL_SWEEP[0] * w, WHEEL_SWEEP[1] * w, WHEEL_SWEEP[2] * w],
      seconds: seconds - ticks(3),
      until: () => entityGone(caster),
    });
  }
  lighting.skillBody(c.scene, skill, 'wheel', out => {
    const t = caster.transform;
    if (!t) return;
    const f = forwardOf(orbit());
    out.x = t.pos.x + f.x * radius;
    out.y = t.pos.y;
    out.z = t.pos.z + f.z * radius;
  });
  const p = new Vector3();
  for (let k = 0; k < 25; k++) {
    delay(ticks(k), () => {
      if (entityGone(caster)) return;
      ground(p);
      if (hd) {
        if (k % 2 === 0) effects.spawn('particles', c.scene, p, { recipe: WHEEL_DUST, count: 1 });
      } else effects.spawn('particles', c.scene, p, { recipe: WHEEL_SMOKE, count: 1 });
      if (hellas) {
        effects.spawn('particles', c.scene, new Vector3(p.x, p.y + cm(120), p.z), { recipe: WHEEL_SPRAY, count: 1 });
        return;
      }
      const a = orbit();
      for (let j = 0; j < 4; j++) {
        const at = new Vector3(p.x + rand(-0.1, 0.1), p.y, p.z + rand(-0.1, 0.1));
        if (hd) {
          effects.spawn('particles', c.scene, at, { recipe: JOINT_SPARKS_HD, count: 1, heading: sparkHeading(rand(-30, 30) * DEG, a + rand(90, 120) * DEG) });
          if (Math.random() < 1 / 3) effects.spawn('particles', c.scene, at, { recipe: SPARK_CHIPS_HD, count: 1 });
        } else jointSpark(c.scene, at, sparkHeading(rand(-30, 30) * DEG, a + rand(90, 120) * DEG), 0.25);
      }
    });
  }
}

/**
 * Twisting Slash at its impact key (ZzzCharacter.cpp:4410-4422): SOUND_SKILL_SWORD4, MODEL_SKILL_WHEEL1 (LT 5,
 * one WHEEL2 copy a tick) and `PostMoveProcess_Active(15)`, which keeps `Weapon[0]` out of the hand.
 */
const twistingSlashOf = (hd: boolean): Step => (_at, c) => {
  const skill = baseSkill(currentSkill);
  const yaw0 = entityYaw(c.caster);
  const weapon = wieldedWeapon(c.caster);
  const radius = cm(weapon?.group === 3 ? 180 : 150);
  sayAt(c, 'Sound/sKnightSkill4');
  if (weapon) effects.spawn('weaponHide', c.scene, Vector3.Zero(), { entity: c.caster, seconds: ticks(15) });
  for (let i = 0; i < WHEEL_ALPHAS.length; i++) {
    const alpha = WHEEL_ALPHAS[i];
    delay(ticks(i), () => {
      if (!entityGone(c.caster)) wheelCopy(c, skill, yaw0, radius, weapon, alpha, hd);
    });
  }
};
const twistingSlash = twistingSlashOf(false);

export default defineSkill({
  id: 41,
  name: "Twisting Slash",
  // 41 Twisting Slash: at clip key 5 (or AttackTime 15) five copies of the wielded weapon whirl round the knight
  // with sparks, smoke, a glow and a grey light under each; see twistingSlash.
  visual: {
    area: whenClipKey(PlayerAction.PLAYER_ATTACK_SKILL_WHEEL, 5, 14, twistingSlash),
    // Graded tiers: the swept band, warm sparks and chips, dust for smoke, a warm light on each copy.
    enhanced: { area: whenClipKey(PlayerAction.PLAYER_ATTACK_SKILL_WHEEL, 5, 14, twistingSlashOf(true)) },
  },
  clip: { ground: A.PLAYER_ATTACK_SKILL_WHEEL }, // Twisting Slash
});
