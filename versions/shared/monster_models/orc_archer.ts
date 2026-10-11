import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 46,
  name: 'Orc Archer',
  voices: [null, null, 'Sound/mOrcArcherAttack1', 'Sound/mOrcArcherAttack1', 'Sound/mBullDie'],
});
