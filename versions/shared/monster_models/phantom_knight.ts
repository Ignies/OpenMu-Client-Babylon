import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 53,
  name: 'Phantom Knight',
  voices: ['Sound/mPhantom1', 'Sound/mPhantom1', 'Sound/mPhantomAttack1', 'Sound/mPhantomAttack1', 'Sound/mPhantomDie'],
});
