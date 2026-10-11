import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 32,
  name: 'Bali',
  voices: ['Sound/mBali1', 'Sound/mBali2', 'Sound/mBaliAttack1', 'Sound/mBaliAttack2', 'Sound/mBali2'],
});
