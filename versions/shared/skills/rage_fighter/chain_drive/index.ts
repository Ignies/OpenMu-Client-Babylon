import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { IMPACT_HEIGHT, arcHit, atCaster, flying, perTick, seq, slash, sprite, ticks, type Step } from '@/controllers/skills/visuals';
import { effects } from '@/controllers/fx';
import { entityGone, entityPos, entityYaw } from '@/controllers/fx/core';
import { playCombat } from '@/controllers/sound';
import { whenClipKey } from '../../_shared';

import { A } from '@/controllers/combat/recipes';

/** BITMAP_SWORDEFF's LifeTime (EffectRegistry.cpp:87); it dies once the caster's GIANTSWING is over. */
const SWORDEFF_TICKS = 200;

/** One of the two blows: an arc burst on the target and Rage_Giantswing_Att (no target: neither, MoveHandlers.cpp:9346-9347). */
const blow: Step = (_at, c) => {
  const target = c.target;
  if (!target || entityGone(target)) return;
  arcHit(entityPos(target, IMPACT_HEIGHT, new Vector3()), c);
  const p = c.caster.transform?.pos;
  if (p) playCombat('Sound/Ragefighter/Rage_Giantswing_Att', { x: p.x, z: p.z });
};

/** The first blow also sends the giant-swing MODEL_SHOCKWAVE01 wave out from the caster (:9330-9340). */
const wave: Step = (_at, c) =>
  effects.spawn('model', c.scene, entityPos(c.caster, 0.05, new Vector3()), { model: MODEL.shockwave, seconds: ticks(15), scale: 0.8, colour: RGBS.arc, follow: flying(c, 0.05, perTick(40)), yaw: entityYaw(c.caster) });

/**
 * BITMAP_SWORDEFF at the packet (MonkSystem.cpp:1121-1126); it reads the caster's GIANTSWING key each tick
 * (MoveHandlers.cpp:9312-9380): past 6 the wave and the first blow, past 11 the second. Leaving the clip drops them.
 */
const chainDrive: Step = (at, c) => {
  slash(RGBS.arc, TEX.motionBlur, 0.7)(at, c);
  atCaster(sprite({ texture: TEX.swordEff, colour: RGBS.arc, size: 1.6, seconds: 0.5, spin: 4, grow: 1.6 }), 0.9)(at, c);
  whenClipKey(A.PLAYER_SKILL_GIANTSWING, 6.001, SWORDEFF_TICKS, seq(wave, blow), false, 'drop')(at, c);
  whenClipKey(A.PLAYER_SKILL_GIANTSWING, 11.001, SWORDEFF_TICKS, blow, false, 'drop')(at, c);
};

export default defineSkill({
  id: 262,
  name: "Chain Drive",
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [558],
  // A hit does not cut the swing short, and the target is swung round on the facing it started with
  // (ZzzCharacter.cpp:1283-1297, ZzzInterface.cpp:7394-7419).
  noFlinch: [A.PLAYER_SKILL_GIANTSWING],
  holdsFacing: [A.PLAYER_SKILL_GIANTSWING],
  // 262 Chain Drive: the sword effect at the caster, two blows on the swing's keys; see chainDrive.
  visual: { cast: chainDrive },
  sound: 'Sound/Ragefighter/Rage_Giantswing', // Chain Drive (MonkSystem.cpp:1125)
  delayMs: 700, // Chain Drive
  clip: { ground: A.PLAYER_SKILL_GIANTSWING }, // Chain Drive
  stepIn: 'midClip',
});
