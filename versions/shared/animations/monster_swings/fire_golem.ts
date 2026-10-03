import { defineMonsterSwing } from '@/controllers/anim';
import { MonsterActionType as A } from '@versions/shared/objects/enum';

// MONSTER_FIRE_GOLEM's hook on the Hunting Ground.
export default defineMonsterSwing({
  name: 'fire_golem',
  monsters: [291],
  worlds: [31],
  // AT_SKILL_BOSS.
  bySkill: { 50: A.Attack1 },
  otherwise: A.Attack2,
});
