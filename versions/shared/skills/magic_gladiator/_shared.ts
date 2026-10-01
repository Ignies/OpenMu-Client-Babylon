import { CAST_HEIGHT, SkillContext, cm } from '@/controllers/skills/visuals';
import { DEG, WEAPON_LINK_BONE } from '../_shared';
import { ENUM_WORLD } from '@/core/types';
import { boneLocalPos, entityGone, type ParticleRecipe } from '@/controllers/fx/core';
import { RGBS, TEX } from '@/controllers/fx/recipes';
import { type Sounds } from '@/controllers/sound/recipes';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { playCombat } from '@/controllers/sound/combat';
import { storeRef } from '@/app/storeRef';

/** Embers shed off Fire Slash's crescent, rising as the BITMAP_FIRE cards do. Round flares: Spark01 reads as squares this small. */
export const MG_EMBERS: ParticleRecipe = {
  texture: TEX.flare,
  colour: RGBS.fire,
  colourEnd: RGBS.ember,
  size: 0.13,
  sizeJitter: 0.05,
  life: 0.45,
  lifeJitter: 0.2,
  box: [0.1, 0.1, 0.1],
  dir1: [-0.6, 0.3, -0.6],
  dir2: [0.6, 1, 0.6],
  power: 1.3,
  powerJitter: 0.6,
  gravity: 1.2,
  spin: 3,
  capacity: 256,
};

/** `PlayBuffer` with no object: positionless, as loud for a bystander as for the caster. */
export const mgSay = (key: Sounds): void => playCombat(key);
/** sCMW and sCColdAttack are loaded on Battle Castle only (MapManager.cpp:280-281); anywhere else the original plays nothing. */
export const mgSayOnBattleCastle = (key: Sounds): void => {
  if (storeRef().world?.mapIndex === ENUM_WORLD.WD_30BATTLECASTLE) playCombat(key);
};

/** Turn `a` toward `to` by at most `max` radians (TurnAngle2). */
export function mgTurn(a: number, to: number, max: number): number {
  const d = Math.atan2(Math.sin(to - a), Math.cos(to - a));
  return a + Math.max(-max, Math.min(max, d));
}

/**
 * UseSkillWarrior's BITMAP_SHINY+2 (SkillCast.cpp:374; ZzzEffectParticle.cpp:25-45, :7322-7325): Shiny03, 128 x 16 px,
 * LT 18, `Scale = sin(LT * 10 deg) * 3`, at the weapon link bone + (0, -120, 0) cm. The hero's own cast only.
 */
export function mgGlint(c: SkillContext): void {
  if (!c.caster.localPlayer) return;
  let lt = 18;
  const local = new Vector3(0, cm(-120), 0);
  const p = new Vector3();
  effects.spawn('ticked', c.scene, p, {
    tick(fx) {
      if (--lt <= 0 || entityGone(c.caster)) return false;
      const s = Math.sin(lt * 10 * DEG) * 3;
      boneLocalPos(c.caster, WEAPON_LINK_BONE, local, p, CAST_HEIGHT);
      fx.sprite(TEX.shiny3, RGBS.white, p.x, p.y, p.z, cm(128) * s, cm(16) * s, 0);
      return true;
    },
  });
}
