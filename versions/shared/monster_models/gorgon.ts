import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 11,
  name: 'Gorgon',
  voices: ['Sound/mGorgon1', 'Sound/mGorgon2', 'Sound/mGorgonAttack1', 'Sound/mGorgonAttack2', 'Sound/mGorgonDie'],
});
