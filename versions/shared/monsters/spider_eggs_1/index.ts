import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 460,
  Name: 'Spider Eggs',
  maxHealth: 40000,
  model: { type: 151, scale: 0.3 },
});
