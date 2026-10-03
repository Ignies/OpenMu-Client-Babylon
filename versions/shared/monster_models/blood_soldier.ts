import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 65,
  name: 'Blood Soldier',
  voices: ['Sound/mBSoldierIdle1', 'Sound/mBSoldierIdle2', 'Sound/mBSoldierAttack1', 'Sound/mBSoldierAttack2', 'Sound/mBSoldierDeath'],
});
