import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 418,
  Name: 'Strange Rabbit',
  maxHealth: 60,
  model: { type: 128, scale: 0.95 },
});
