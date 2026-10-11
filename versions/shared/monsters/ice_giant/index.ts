import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 456,
  Name: 'Ice Giant',
  maxHealth: 84000,
  model: { type: 147, scale: 1 },
});
