import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 3,
  name: 'Dark Knight',
  voices: ['Sound/mDarkKnight1', 'Sound/mDarkKnight2', 'Sound/mDarkKnightAttack1', 'Sound/mDarkKnightAttack2', 'Sound/mDarkKnightDie'],
  speedScale: 1.2,
});
