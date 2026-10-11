import { defineSkill } from '@/controllers/skills/define';
import { DEG, randInt, whenClipKey } from '../../_shared';
import { emitBurst, entityPos, entityYaw, fxNow, type ParticleRecipe, type RGB } from '@/controllers/fx/core';
import { PlayerAction } from '@versions/shared/objects/enum';
import { RGBS, TEX } from '@/controllers/fx/recipes';
import { SkillContext, Step, cm, forwardOf } from '@/controllers/skills/visuals';
import { type StripOptions, type TailStrip } from '@/controllers/fx/ticked';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';
import { mgSayOnBattleCastle } from '../_shared';

import { A } from '@/controllers/combat/recipes';

import { effectLight } from '@/controllers/lighting/recipes';

/** JOINT_FORCE sub4 (Hole.jpg), 13 tails. */
const MG_CANNON_BEAM: StripOptions = { texture: TEX.hole, maxTails: 13 };
/** BITMAP_FLARE_BLUE sub6, 15 tails. */
const MG_CANNON_RING: StripOptions = { texture: TEX.flareBlue, maxTails: 15, batch: 12 };
const MG_CANNON_BLUE: RGB = [0.1, 0.6, 1];
/** Death Cannon's muzzle and head sparks, in the beam's blue. */
const MG_CANNON_SPARKS: ParticleRecipe = {
  texture: TEX.flare,
  colour: [0.5, 0.85, 1],
  colourEnd: [0.1, 0.4, 1],
  size: 0.13,
  sizeJitter: 0.05,
  life: 0.4,
  lifeJitter: 0.15,
  power: 2,
  powerJitter: 0.8,
  gravity: -1,
  spin: 3,
  capacity: 256,
};

/** How far down the beam the head still leaves its rings and cards: past this it is far off screen. */
const MG_CANNON_DRESSED = 30;
/** Enhanced: how far out the head's light follows it before it holds and fades (tiles). */
const MG_CANNON_LIT = 5;

/**
 * Death Cannon's beam (ZzzCharacter.cpp:5018-5026; ZzzEffectJoint.cpp:2321-2366, :2999-3007, :6395-6428): JOINT_FORCE
 * sub4 130 cm up along the caster's yaw, straight. Each tick the head moves `Velocity` (8 cm at first), then
 * `Velocity += D2`, `D2 += 15.5` while LT >= 15 and 0.5 after; the last 13 heads are the streak, Hole.jpg, width 40,
 * `Light / 1.3` a tick below LT 10. At every head a BITMAP_FLARE_BLUE sub6 ring, a flare01 at 1.6 and a Shiny02 at 1.5
 * turned with WorldTime, both (0.1, 0.6, 1). `enh` (graded tiers) adds a muzzle flash with a spark burst, sparks off
 * the head, and a light that rides the head out to MG_CANNON_LIT tiles.
 */
function mgCannonBeam(c: SkillContext, enh = false): void {
  const feet = entityPos(c.caster, 0, new Vector3());
  const yaw = entityYaw(c.caster);
  const f = forwardOf(yaw);
  const sy = feet.y + 1.3;
  let s = 0;
  let v = 8;
  let d = 3;
  let lt = 20;
  let light = 1;
  let strip: TailStrip | null = null;
  const rings: { strip: TailStrip; x: number; y: number; z: number; phase: number; lt: number }[] = [];
  const muzzle = enh ? new Vector3(feet.x + f.x * 0.4, sy, feet.z + f.z * 0.4) : null;
  const head = new Vector3();
  let flash = enh ? 8 : 0;
  if (muzzle) {
    emitBurst(c.scene, MG_CANNON_SPARKS, muzzle, 14);
    lighting.skillFollow(c.scene, 73, out => {
      const lit = Math.min(cm(s), MG_CANNON_LIT);
      out.x = feet.x + f.x * lit;
      out.y = sy;
      out.z = feet.z + f.z * lit;
    });
  }
  effects.spawn('ticked', c.scene, feet, {
    tick(fx) {
      if (muzzle && flash > 0) {
        const k = flash / 8;
        fx.sprite(TEX.flare, MG_CANNON_BLUE, muzzle.x, muzzle.y, muzzle.z, 2.2 * k, 2.2 * k, flash, k);
        fx.sprite(TEX.flare, RGBS.white, muzzle.x, muzzle.y, muzzle.z, 0.9 * k, 0.9 * k, -flash, k);
        flash--;
      }
      if (lt >= 0) {
        strip ??= fx.strip(MG_CANNON_BEAM);
        s += v;
        v += d;
        d += lt >= 15 ? 15.5 : 0.5;
        if (lt < 10) light /= 1.3;
        const hx = feet.x + f.x * cm(s);
        const hz = feet.z + f.z * cm(s);
        if (cm(s) < MG_CANNON_DRESSED) {
          rings.push({ strip: fx.strip(MG_CANNON_RING), x: hx, y: sy, z: hz, phase: randInt(360), lt: 15 });
          fx.sprite(TEX.flare, MG_CANNON_BLUE, hx, sy, hz, cm(64) * 1.6, cm(64) * 1.6, 0);
          fx.sprite(TEX.shiny2, MG_CANNON_BLUE, hx, sy, hz, cm(32) * 1.5, cm(64) * 1.5, fxNow() * 100 * DEG);
          if (muzzle) emitBurst(c.scene, MG_CANNON_SPARKS, head.set(hx, sy, hz), 3);
        }
        strip.push(hx, sy, hz, cm(20), yaw, 0);
        strip.light = light;
        if (--lt < 0) strip.light = 0;
      }
      // FLARE_BLUE sub6 (ZzzEffectJoint.cpp:1883-1920, :5570-5605): radius 2 cm x LT, 0.8 rad a tick from a random
      // phase, across the beam, its centre drifting 2 cm a tick along it; LT 15.
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.x += f.x * cm(2);
        r.z += f.z * cm(2);
        const a = r.phase + r.lt * 0.8;
        const rad = cm(Math.max(r.lt, 1) * 2);
        const side = -Math.cos(a) * rad;
        r.strip.push(r.x + Math.cos(yaw) * side, r.y + Math.sin(a) * rad, r.z + Math.sin(yaw) * side, cm(15), yaw, 0);
        if (--r.lt < 0) {
          fx.drop(r.strip);
          rings[i] = rings[rings.length - 1];
          rings.pop();
        }
      }
      return lt >= 0 || rings.length > 0 || flash > 0;
    },
  });
}

/** Death Cannon (73): the beam and SOUND_BCS_DEATH_CANON once DEATH_CANNON reaches frame 3, with a target (ZzzCharacter.cpp:2990-2995, :4811). */
const mgDeathCannon = (enh: boolean): Step => (at, c) => {
  if (!c.target) return;
  whenClipKey(PlayerAction.PLAYER_ATTACK_DEATH_CANNON, 3, 14, (_p, cc) => {
    mgSayOnBattleCastle('Sound/battlecastle/sCMW');
    mgCannonBeam(cc, enh);
  })(at, c);
};
const deathCannon = mgDeathCannon(false);
const deathCannonEnhanced = mgDeathCannon(true);

export default defineSkill({
  id: 73,
  name: "Mana Rays",
  // 73 Death Cannon (Mana Rays): the JOINT_FORCE sub4 beam at DEATH_CANNON frame 3 (deathCannon). No target effect.
  visual: { cast: deathCannon, enhanced: { cast: deathCannonEnhanced } },
  clip: { ground: A.PLAYER_ATTACK_DEATH_CANNON }, // Death Cannon (UseSkillWizard, :2457)
  // Death Cannon: nothing, as the original; the empty row keeps the wizardry cast flash off.
  // Enhanced: the beam's blue from the muzzle, riding the head out.
  light: { enhanced: { follow: effectLight([0.1, 0.6, 1], 1.4, 0.6, { release: 0.35 }) } },
});
