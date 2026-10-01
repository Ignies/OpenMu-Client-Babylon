import { defineSkill } from '@/controllers/skills/define';
import { CAST_HEIGHT, Step, baseSkill, currentSkill } from '@/controllers/skills/visuals';
import { PlayerAction } from '@versions/shared/objects/enum';
import { bonePos, delay, entityGone, type PointSource } from '@/controllers/fx/core';
import { RGBS, TEX } from '@/controllers/fx/recipes';
import { RIGHT_HAND_BONE } from '@/controllers/actors/weaponAttachment';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { strikeOn } from '../_shared';

import { A } from '@/controllers/combat/recipes';

import { effectLight } from '@/controllers/lighting/recipes';

/** Seconds into PLAYER_DEFENSE1 the guard is up. */
const GUARD_SET = 0.2;
/** Tiles above the weapon hand the guard glint sits. */
const GUARD_GLINT_UP = 0.3;

/**
 * Enhanced Defense: the original draws nothing, so the guard only gets a steel glint on the
 * weapon hand as it sets, and its light, while the caster is still in the guard.
 */
const guardGlint: Step = (_at, c) => {
  const skill = baseSkill(currentSkill);
  delay(GUARD_SET, () => {
    if (entityGone(c.caster) || c.caster.modelObject?.CurrentAction !== PlayerAction.PLAYER_DEFENSE1) return;
    // Up the raised blade, clear of the body that would clip a glint on the hand itself.
    const follow: PointSource = out => {
      bonePos(c.caster, RIGHT_HAND_BONE, out, CAST_HEIGHT);
      out.y += GUARD_GLINT_UP;
      return out;
    };
    const at = follow(new Vector3());
    effects.spawn('sprite', c.scene, at, { texture: TEX.flare, colour: RGBS.steel, size: 0.8, seconds: 0.35, growFrom: 0.4, fadeTail: 0.6, follow });
    effects.spawn('sprite', c.scene, at, { texture: TEX.shiny, colour: RGBS.white, size: 0.6, seconds: 0.4, growFrom: 0.3, grow: 0.5, spin: 3, fadeTail: 0.5, follow });
    strikeOn(c.scene, skill, c.caster);
  });
};

export default defineSkill({
  id: 18,
  name: "Defense",
  // 18 Defense: the guard clip and sKnightDefense only; the original draws nothing (SkillCast.cpp:224-231,
  // WSclient.cpp:3610-3612). OpenMU answers with 0x19, so the echo carries ReceiveAction's clip and sound.
  // Enhanced adds a steel glint as the guard sets.
  visual: { enhanced: { impact: guardGlint } },
  // 16 Soul Barrier and its masters: none at the cast; the buff's arrival and the impact play it (controllers/skills/visuals.ts).
  sound: 'Sound/sKnightDefense', // Defense (SOUND_SKILL_DEFENSE, WSclient.cpp:3612)
  // --- Dark Knight (UseSkillWarrior, ZzzInterface.cpp:2221-2300) -----------
  // Defense: the guard pose on every mount, no Helper branch (SkillCast.cpp:224-231, WSclient.cpp:3610-3612).
  clip: { ground: A.PLAYER_DEFENSE1 },
  // Defense: the original lights nothing and draws nothing. Enhanced: the guard glint's steel.
  // A glint is a small art: a soft pool, not a lamp.
  light: { enhanced: { strike: effectLight([0.85, 0.85, 0.95], 0.5, 0.35, { gain: 0.45, floorGain: 0.4, attack: 0.08 }) } },
});
