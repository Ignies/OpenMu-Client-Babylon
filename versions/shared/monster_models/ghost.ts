import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 7,
  name: 'Ghost',
  voices: ['Sound/mGhost1', 'Sound/mGhost2', 'Sound/mGhostAttack1', 'Sound/mGhostAttack2', 'Sound/mGhostDie'],
});
