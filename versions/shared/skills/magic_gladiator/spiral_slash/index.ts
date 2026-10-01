import { defineSkill } from '@/controllers/skills/define';
import { DEG, randInt, whenClipKey } from '../../_shared';
import { emitBurst, entityPos, entityYaw, type ParticleRecipe, type RGB } from '@/controllers/fx/core';
import { PlayerAction } from '@versions/shared/objects/enum';
import { RGBS, TEX } from '@/controllers/fx/recipes';
import { SkillContext, Step, cm } from '@/controllers/skills/visuals';
import { type StripOptions, type TailStrip } from '@/controllers/fx/ticked';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';
import { mgGlint, mgSay, mgSayOnBattleCastle } from '../_shared';

import { A } from '@/controllers/combat/recipes';

import { effectLight } from '@/controllers/lighting/recipes';

/** BITMAP_FLARE sub23 (Flare.jpg), 15 tails. */
const MG_SPIRAL_RIBBON: StripOptions = { texture: TEX.flareBig, maxTails: 15 };
/** Gold chips shed from the Spiral Slash ribbon heads (Flare.jpg's own gold). */
const MG_SPIRAL_SPARKS: ParticleRecipe = {
  texture: TEX.flare,
  colour: RGBS.gold,
  colourEnd: RGBS.ember,
  size: 0.12,
  sizeJitter: 0.04,
  life: 0.45,
  lifeJitter: 0.15,
  power: 1.2,
  powerJitter: 0.5,
  gravity: -1.5,
  spin: 3,
  capacity: 256,
};
const MG_SPIRAL_GOLD: RGB = [1, 0.72, 0.3];

/** Spiral Slash's five ribbons: start height (cm / 100), yaw offset, pitch and yaw step signs (ZzzEffectJoint.cpp:2010-2016, :5849-5856). */
const MG_SPIRAL_UP = [2, 0.1, 2, 0.1, 1];
const MG_SPIRAL_YAW = [90, 90, -90, -90, 180];
const MG_SPIRAL_PITCH = [3, -3, 3, -3, 0];
const MG_SPIRAL_TURN = [-1, -1, 1, 1, -1];

/**
 * One BITMAP_FLARE sub23 ribbon `k` (ZzzEffectJoint.cpp:1996-2025, :5832-5877): LT 24 - k, still until LT 19. Then a
 * tick at a time it takes `Direction[2]` steps (1, 5, 9, ...): D1 += 1.5 turns the yaw, pitch 3 deg a step, the head on
 * a 200 cm sphere round where it spawned, until 15 tails are down, then one step a tick. Below LT 8 it stops and the tail
 * runs into the head. Flare.jpg, width 40, white, both faces. `enh` (graded tiers) puts a gold glow on the head and
 * sheds chips off it.
 */
function mgSpiralRibbon(c: SkillContext, k: number, enh = false): void {
  const feet = entityPos(c.caster, 0, new Vector3());
  const sy = feet.y + MG_SPIRAL_UP[k];
  let yaw = entityYaw(c.caster) + MG_SPIRAL_YAW[k] * DEG;
  let pitch = 0;
  let d1 = 5;
  let steps = 1;
  let lt = 24 - k;
  const head = new Vector3(feet.x, sy, feet.z);
  let strip: TailStrip | null = null;
  effects.spawn('ticked', c.scene, feet, {
    tick(fx) {
      strip ??= fx.strip(MG_SPIRAL_RIBBON);
      if (lt < 20) {
        if (lt < 8) {
          strip.push(head.x, head.y, head.z, cm(20), yaw, pitch);
        } else {
          for (let i = 0; i < steps; i++) {
            d1 += 1.5;
            pitch += MG_SPIRAL_PITCH[k] * DEG;
            yaw += MG_SPIRAL_TURN[k] * d1 * DEG;
            if (d1 > 15) d1 = 15;
            const cp = Math.cos(pitch);
            head.set(feet.x + cp * Math.sin(yaw) * 2, sy - Math.sin(pitch) * 2, feet.z - cp * Math.cos(yaw) * 2);
            strip.push(head.x, head.y, head.z, cm(20), yaw, pitch);
            if (strip.numTails >= 14) break;
          }
          steps += 4;
        }
        if (enh) {
          const lum = Math.min(1, lt / 12);
          fx.sprite(TEX.flare, MG_SPIRAL_GOLD, head.x, head.y, head.z, 0.9, 0.9, lt * 0.5, lum);
          if (lt >= 6) emitBurst(c.scene, MG_SPIRAL_SPARKS, head, 2);
        }
      }
      return --lt >= 0;
    },
  });
}

/** One Spiral Slash wave: its ribbons and SOUND_BCS_ONE_FLASH (ZzzCharacter.cpp:2960-2978). */
const mgSpiralWave = (ks: readonly number[], enh = false): Step => (_at, c) => {
  mgSayOnBattleCastle('Sound/battlecastle/sCColdAttack');
  for (const k of ks) mgSpiralRibbon(c, k, enh);
  if (!enh) return;
  // One light per wave at the centre of the ribbons' 200 cm sphere.
  const p = entityPos(c.caster, 1.2, new Vector3());
  lighting.skillFollow(c.scene, 57, out => {
    out.x = p.x;
    out.y = p.y;
    out.z = p.z;
  });
};

/**
 * Spiral Slash (57): ribbons 2 and 3 at ONE_FLASH frame 2.3, then 0, 1 and 4 past frame 5. The original's first wave
 * only fires inside frames 2.3-2.6, which a fast clip can step over; here it always fires. The hero's own cast
 * brandishes the blade (UseSkillWarrior, SkillCast.cpp:357-376).
 */
const mgSpiralSlash = (enh: boolean): Step => (at, c) => {
  if (c.caster.localPlayer) {
    mgGlint(c);
    mgSay(randInt(2) ? 'Sound/eSwingWeapon2' : 'Sound/eSwingWeapon1');
  }
  whenClipKey(PlayerAction.PLAYER_ATTACK_ONE_FLASH, 2.3, 15, mgSpiralWave([2, 3], enh))(at, c);
  whenClipKey(PlayerAction.PLAYER_ATTACK_ONE_FLASH, 5.001, 15, mgSpiralWave([0, 1, 4], enh))(at, c);
};
const spiralSlash = mgSpiralSlash(false);
const spiralSlashEnhanced = mgSpiralSlash(true);

export default defineSkill({
  id: 57,
  name: "Spiral Slash",
  // 57 Spiral Slash: five BITMAP_FLARE sub23 ribbons in two waves on the ONE_FLASH clip (spiralSlash).
  visual: { cast: spiralSlash, enhanced: { cast: spiralSlashEnhanced } },
  sound: 'Sound/sKnightSkill2', // Spiral Slash
  clip: { ground: A.PLAYER_ATTACK_ONE_FLASH }, // Spiral Slash (WSclient.cpp:4164)
  // Spiral Slash lights nothing in the original. Enhanced: each wave's gold over the ribbons' 200 cm sphere.
  light: { enhanced: { follow: effectLight([1, 0.72, 0.3], 2.2, 0.9, { release: 0.45 }) } },
});
