import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 29,
  name: 'Death Knight',
  voices: ['Sound/mDarkKnight1', 'Sound/mDarkKnight2', 'Sound/mDarkKnightAttack1', 'Sound/mDarkKnightAttack2', 'Sound/mDarkKnightDie'],
});
