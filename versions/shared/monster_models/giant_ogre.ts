import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 58,
  name: 'Giant Ogre',
  voices: [null, null, 'Sound/mBlackSkullAttack', null, 'Sound/mGhaintOrgerDie'],
});
