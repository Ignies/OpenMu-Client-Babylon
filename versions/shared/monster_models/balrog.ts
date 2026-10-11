import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 27,
  name: 'Balrog',
  voices: ['Sound/mBalrog1', 'Sound/mBalrog2', null, null, 'Sound/mBalrogDie'],
});
