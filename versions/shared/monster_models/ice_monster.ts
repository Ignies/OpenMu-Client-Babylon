import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 15,
  name: 'Ice Monster',
  voices: ['Sound/mIceMonster1', 'Sound/mIceMonster2', 'Sound/mIceMonster1', 'Sound/mIceMonster1', 'Sound/mIceMonsterDie'],
});
