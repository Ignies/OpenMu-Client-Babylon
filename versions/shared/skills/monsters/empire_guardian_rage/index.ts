import { defineMonsterSkill, type MonsterSkillLook } from '@/controllers/skills';
import { monsterAttackState } from '@/controllers/anim/monsterAttackClip';
import { entityPos } from '@/controllers/fx/core';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { createInferno } from '../../dark_wizard/inferno';
import { circleSpirits } from '../../dark_wizard/nova';

/** ATMON_SKILL_EMPIREGUARDIAN_BERSERKER (_enum.h:3329). */
const BERSERKER = 59;

/**
 * The boss's next MoveMonsterVisual with its rage flag up (the Berserker sets Appear, which every boss's case
 * lists): CreateInferno and two MODEL_CIRCLE sub4 at its feet, then the flag drops
 * (GMEmpireGuardian1.cpp:393-401, GMEmpireGuardian2.cpp:362-368, GMEmpireGuardian3.cpp:226-233, GMEmpireGuardian4.cpp:440-446).
 */
const rage: MonsterSkillLook = c => {
  const state = monsterAttackState(c.caster);
  if (!state.rage) return;
  state.rage = false;
  const at = entityPos(c.caster, 0, new Vector3());
  createInferno(at, c);
  circleSpirits(c.scene, at);
  circleSpirits(c.scene, at);
};

export default defineMonsterSkill({
  name: 'Empire Guardian rage',
  // Gaion, Jerint (Jerry), Raymond, Ercanne (Lucas), Daesuler (Fred), Bermont (Hammerize), Kato (Dual Berserker), Gallia (Devil Lord).
  monsters: [504, 505, 506, 507, 508, 509, 510, 511],
  looks: { [BERSERKER]: rage },
});
