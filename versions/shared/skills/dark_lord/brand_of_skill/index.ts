import { defineSkill } from '@/controllers/skills/define';
import { CAST_HEIGHT, Step, atCaster, model, particles, seq, ticks, weaponBone } from '@/controllers/skills/visuals';
import { HOLY_MOTES, MODEL, RGBS } from '@/controllers/fx/recipes';
import { entityPos, type RGB } from '@/controllers/fx/core';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';

import { A } from '@/controllers/combat/recipes';
import { MOUNTED_HAND } from '../../_shared';

/** Add Critical / Brand of Skill: MODEL_DARKLORD_SKILL at weapon bone 0 (sub0) and bone 1 (sub1), Light (1,0.6,0.3). */
const addCritical: Step = (_at, c) => {
  const tint: RGB = [1, 0.6, 0.3];
  effects.spawn('model', c.scene, entityPos(c.caster, CAST_HEIGHT, new Vector3()), { model: MODEL.darkLordSkill, seconds: ticks(20), scale: 0.6, colour: tint, follow: weaponBone(c.caster), grow: 1.5 });
  effects.spawn('model', c.scene, entityPos(c.caster, CAST_HEIGHT, new Vector3()), { model: MODEL.darkLordSkill, seconds: ticks(20), scale: 0.6, colour: tint, follow: weaponBone(c.caster), grow: 1.5, yaw: Math.PI / 2 });
  particles({ recipe: HOLY_MOTES, count: 12, height: 0.4 })(entityPos(c.caster, 0.6, new Vector3()), c);
};

export default defineSkill({
  id: 75,
  name: "Brand of Skill",
  // ReceiveMagicFinish drops eBuff_AddSkill (WSclient.cpp:3918-3920).
  effect: 19,
  // 75 Brand of Skill: MODEL_DARKLORD_SKILL at the weapon bones + MODEL_MANA_RUNE sub0 (LT 50, Scale 0→, Alpha 0.3, z+300).
  visual: { impact: seq(addCritical, atCaster(model({ model: MODEL.manaRune, seconds: ticks(50), scale: 0.2, grow: 5, colour: RGBS.gold, alpha: 0.3, yaw: Math.PI / 4 }), 3)) },
  clip: { ground: A.PLAYER_SKILL_HAND1, ...MOUNTED_HAND }, // Add Skill (Brand of Skill)
});
