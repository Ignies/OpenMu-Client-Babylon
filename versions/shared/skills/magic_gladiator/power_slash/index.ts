import { defineSkill } from '@/controllers/skills/define';
import { DEG, randInt } from '../../_shared';
import { emitBurst, entityPos, entityYaw, type ParticleRecipe, type RGB } from '@/controllers/fx/core';
import { RGBS, TEX } from '@/controllers/fx/recipes';
import { SkillContext, Step, cm, forwardOf, ticks } from '@/controllers/skills/visuals';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';
import { mgSay } from '../_shared';

import { A } from '@/controllers/combat/recipes';
import { MOUNTED_SWORD } from '../../_shared';

import { effectLight } from '@/controllers/lighting/recipes';

/** MODEL_MAGIC2's blue and Death Cannon's (MoveHandlers.cpp:3355, ZzzEffectJoint.cpp:6421). */
const MG_ORB_BLUE: RGB = [0.3, 0.6, 1];
/**
 * BITMAP_SMOKE sub3 off each Power Slash orb: smoke01, LT 10, Scale 0.8-1.11 growing 0.1 a tick, flung 40-47 cm a
 * tick at a random heading (pitch +-45) and slowed x0.4 a tick, light `LT / 8` x (0.8, 0.8, 1) (ZzzEffectParticle.cpp:1253,
 * :5330). The decaying throw is drawn as the same 0.7 tiles at a constant speed.
 */
const MG_SMOKE_SPRAY: ParticleRecipe = {
  texture: TEX.smoke,
  colour: [0.8, 0.8, 1],
  size: 0.61,
  sizeJitter: 0.16,
  life: ticks(10),
  lifeJitter: 0,
  box: [0.01, 0.01, 0.01],
  dir1: [-1, -0.7, -1],
  dir2: [1, 0.7, 1],
  power: 1.75,
  powerJitter: 0.15,
  endScale: 2,
  capacity: 320,
};
/**
 * BITMAP_SMOKE sub11: LT 50, Scale 1.2-1.67 growing 0.05 a tick, +-32 cm across and 32-95 cm up, the same thrown
 * drift, sinking 1 cm a tick, light `LT / 50` x (0.3, 0.6, 1) x the orb's Luminosity (:1259, :5336); its mean 0.85 here.
 */
const MG_SMOKE_DRIFT: ParticleRecipe = {
  texture: TEX.smoke,
  colour: [0.3 * 0.85, 0.6 * 0.85, 0.85],
  size: 0.92,
  sizeJitter: 0.16,
  life: ticks(50),
  lifeJitter: 0,
  box: [0.32, 0.32, 0.32],
  dir1: [-1, -1.4, -1],
  dir2: [1, 0, 1],
  power: 0.35,
  powerJitter: 0.15,
  endScale: 2.7,
  capacity: 320,
};
/** Blue motes shed behind each Power Slash orb. */
const MG_ORB_SPARKS: ParticleRecipe = {
  texture: TEX.flare,
  colour: [0.55, 0.8, 1],
  colourEnd: [0.15, 0.35, 1],
  size: 0.18,
  sizeJitter: 0.06,
  life: 0.5,
  lifeJitter: 0.2,
  box: [0.15, 0.25, 0.15],
  power: 0.8,
  powerJitter: 0.4,
  gravity: -0.5,
  spin: 2,
  capacity: 320,
};

/**
 * One Power Slash orb: MODEL_MAGIC2 sub2 (ZzzEffect.cpp:1991-1998, :6645, :8566; MoveHandlers.cpp:3345-3380). LT 20,
 * 60 cm a tick along its yaw at the height it left from, its mesh hidden (`HiddenMesh = 0`). Each tick: 4 sub3 smokes,
 * one sub11 smoke, two white Shiny02 at scale 1.5 and a flare01 at 3.5 in (0.3, 0.6, 1) x Luminosity, 50 cm up, and
 * the terrain light under it. Luminosity rolls 0.7-1.0 and loses 0.2 a tick below LT 5. `enh` (graded tiers) adds a
 * hot white core and blue motes shed behind it.
 */
function mgOrb(c: SkillContext, feet: Vector3, yaw: number, enh = false): void {
  let lt = 20;
  const f = forwardOf(yaw);
  const pos = feet.clone();
  const drift = new Vector3();
  const ride = lighting.skillFollow(c.scene, 56, out => {
    out.x = pos.x;
    out.y = pos.y;
    out.z = pos.z;
  });
  effects.spawn('ticked', c.scene, pos, {
    tick(fx) {
      if (lt <= 0) {
        ride?.stop();
        return false;
      }
      let lum = (7 + randInt(4)) * 0.1;
      if (lt < 5) lum = Math.max(0, lum - (5 - lt) * 0.2);
      emitBurst(c.scene, MG_SMOKE_SPRAY, pos, 4);
      drift.set(pos.x, pos.y + cm(63), pos.z);
      emitBurst(c.scene, MG_SMOKE_DRIFT, drift, 1);
      // Enhanced: five overlapping flares burn to white on the graded buffer; held lower they keep their blue.
      const hot = enh ? 0.7 : 1;
      for (let i = 0; i < 2; i++) fx.sprite(TEX.shiny2, RGBS.white, pos.x, pos.y + 0.5, pos.z, cm(32) * 1.5, cm(64) * 1.5, Math.random() * Math.PI * 2, hot);
      fx.sprite(TEX.flare, MG_ORB_BLUE, pos.x, pos.y + 0.5, pos.z, cm(64) * 3.5, cm(64) * 3.5, Math.random() * Math.PI * 2, enh ? lum * 0.55 : lum);
      if (enh) {
        fx.sprite(TEX.flare, RGBS.white, pos.x, pos.y + 0.5, pos.z, 0.6, 0.6, lt * 0.4, lum);
        drift.set(pos.x, pos.y + 0.5, pos.z);
        emitBurst(c.scene, MG_ORB_SPARKS, drift, 3);
      }
      pos.x += f.x * cm(60);
      pos.z += f.z * cm(60);
      lt--;
      return true;
    },
  });
}

/** Power Slash (56, 482): the five orbs at yaw -40..+40 and SOUND_SKILL_SWORD3 on the clip's first tick (ZzzCharacter.cpp:2819-2843). */
const mgPowerSlash = (enh: boolean): Step => (_at, c) => {
  mgSay('Sound/sKnightSkill3');
  const feet = entityPos(c.caster, 0, new Vector3());
  const yaw = entityYaw(c.caster);
  for (let i = -2; i <= 2; i++) mgOrb(c, feet, yaw + i * 20 * DEG, enh);
};
const powerSlash = mgPowerSlash(false);
const powerSlashEnhanced = mgPowerSlash(true);

export default defineSkill({
  id: 56,
  name: "Power Slash",
  // 56 Power Slash: five hidden MODEL_MAGIC2 sub2 orbs at yaw -40..+40 (powerSlash). The weapon blur is weaponBlur.ts's.
  visual: { cast: powerSlash, enhanced: { cast: powerSlashEnhanced } },
  clip: { ground: A.PLAYER_ATTACK_TWO_HAND_SWORD_TWO, ...MOUNTED_SWORD }, // Power Slash (MG)
  light: {
    follow: { color: [0.3, 0.6, 1], range: 3, seconds: 0.8, release: 0.16, flicker: { min: 0.7, max: 1, steps: 4 }, flickerSmoothing: 1 },
    // Enhanced: the orb's flare reaches ~1.1 tiles, its smoke a little further; five overlap at the start.
    enhanced: { follow: effectLight([0.3, 0.6, 1], 1.5, 0.8, { release: 0.16, flicker: { min: 0.7, max: 1, steps: 4 }, flickerSmoothing: 1 }) },
  },
});
