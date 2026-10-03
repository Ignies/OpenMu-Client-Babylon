import { defineMonsterSwing } from '@/controllers/anim';
import { MonsterActionType as A } from '@versions/shared/objects/enum';

// Medusa's body (MONSTER_MODEL_MEDUSA) in the Swamp of Quiet.
export default defineMonsterSwing({
  name: 'medusa',
  models: [192],
  worlds: [56],
  // Decay and Chaotic Diseier, then Gigantic Storm.
  bySkill: { 38: A.Attack2, 238: A.Attack2, 237: A.Attack3 },
  otherwise: A.Attack1,
});
