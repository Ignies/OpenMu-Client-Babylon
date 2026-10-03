import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 37,
  name: 'Hydra',
  voices: ['Sound/mHydra1', 'Sound/mHydra1', 'Sound/mHydraAttack1', 'Sound/mHydraAttack1', 'Sound/mHydra1'],
  speedScale: 0.4,
});
