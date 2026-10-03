import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 57,
  name: 'Red Skeleton Knight',
  voices: ['Sound/mRedSkull', null, 'Sound/mRedSkullAttack', null, 'Sound/mRedSkullDie'],
});
