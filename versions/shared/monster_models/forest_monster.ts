import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 23,
  name: 'Forest Monster',
  voices: ['Sound/mWoodMon1', 'Sound/mWoodMon2', 'Sound/mWoodMonAttack1', 'Sound/mWoodMonAttack2', 'Sound/mWoodMonDie'],
});
