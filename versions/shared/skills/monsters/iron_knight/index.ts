import { defineMonsterSkill, type MonsterSkillLook } from '@/controllers/skills';
import { ENUM_WORLD as W } from '@/core/types';
import { MonsterActionType as A } from '@versions/shared/objects/enum';
import { cm } from '@/controllers/skills/visuals';
import { entityPos } from '@/controllers/fx/core';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { deathStabStages } from '../../dark_knight/death_stab';
import { comboBurst } from '../../dark_knight/combo';

/** RenderMonsterVisual's sword point bone (`o->BoneTransform[26]`, GM_Raklion.cpp:1925, :1935). */
const SWORD_BONE = 26;

/**
 * The Iron Knights' Attack2 (GM_Raklion.cpp:1899-1961, :2151-2213): Death Stab's staging on AttackTime from bone 26, one
 * MODEL_SPEAR a roll and no sound, while the clip holds; at AttackTime 12 MODEL_COMBO at the body.
 */
const stab: MonsterSkillLook = c =>
  deathStabStages(c, 0, false, {
    bone: SWORD_BONE,
    holds: () => c.caster.monsterAnimation?.action === A.Attack2,
    last: c => comboBurst(entityPos(c.caster, cm(50), new Vector3()), c),
  });

export default defineMonsterSkill({
  name: 'Iron Knight',
  // MONSTER_IRON_KNIGHT on 33, MONSTER_DARK_IRON_KNIGHT on ATMON_SKILL_EX_DARKAIONNIGHT_ATTACKSKILL (GM_Raklion.cpp:2370-2440).
  monsters: [458, 565],
  worlds: [W.WD_57ICECITY, W.WD_58ICECITY_BOSS],
  looks: { 33: stab, 32: stab },
});
