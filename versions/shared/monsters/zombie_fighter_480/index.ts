import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 480,
  Name: 'Zombie Fighter',
  maxHealth: 20000,
  model: { type: 157, scale: 1 },
});
