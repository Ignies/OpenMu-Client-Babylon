import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 50,
  Name: 'Sea Worm',
  maxHealth: 19000,
  model: { type: 38, scale: 1.8 },
});
