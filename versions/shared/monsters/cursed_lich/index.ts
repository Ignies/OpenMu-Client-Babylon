import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 422,
  Name: 'Cursed Lich',
  maxHealth: 900,
  model: { type: 132, scale: 0.95 },
});
