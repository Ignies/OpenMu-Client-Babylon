import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 14,
  name: 'Assassin',
  voices: [null, null, 'Sound/mAssassinAttack1', 'Sound/mAssassinAttack2', 'Sound/mAssassinDie'],
});
