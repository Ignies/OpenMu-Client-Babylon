import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 68,
  name: 'Necron',
  voices: ['Sound/mNecronIdle1', 'Sound/mNecronIdle2', 'Sound/mNecronAttack1', 'Sound/mNecronAttack2', 'Sound/mNecronDeath'],
});
