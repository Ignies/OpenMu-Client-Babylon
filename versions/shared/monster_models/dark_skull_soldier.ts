import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 59,
  name: 'Dark Skull Soldier',
  voices: [null, null, 'Sound/mBlackSkullAttack', null, 'Sound/mBlackSkullDie'],
});
